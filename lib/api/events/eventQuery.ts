/**
 * Event reads.
 *
 * Every list is `.range()`d with a piggybacked exact count — PostgREST caps a
 * response at 1000 rows, so fetch-all-then-slice silently lies past that.
 *
 * None of these throw. They feed public pages and dashboard panels, where a
 * failed read must render as "couldn't load" rather than take the page down —
 * and callers can tell an outage from an empty result, which is a distinction
 * this repo has had to fix on three separate surfaces.
 */

import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
// All image resolution now goes through the shared event-media helper — this
// module no longer names a storage bucket of its own, which is the point of
// the de-fork.
import {
  resolveEventMedia,
  type StorageClient,
} from '@/app/api/helpers/eventMedia';
import { describeDbError } from '@/lib/utils/describeDbError';
import { ilikePattern } from '@/lib/utils/postgrestSearch';
import { eventIdSchema } from '@/lib/validation/events';
import { EMPTY_EVENT_STATS } from '@/lib/types';
import type {
  EventFilters,
  EventStats,
  EventStatus,
  EventWithRefs,
  NearbyEvent,
  PaginatedEvents,
} from '@/lib/types';

/**
 * The embedded shape every read shares. `businesses` and `products` are
 * to-one embeds, which PostgREST returns as an ARRAY — normalised below,
 * because reading `.shop_name` off an array yields undefined and renders as a
 * shop with no name.
 */
const SELECT_WITH_REFS = `
  *,
  business:businesses ( id, shop_name, logo_url ),
  product:products ( id, name, image_url, status )
`;

type EmbeddedRow = Record<string, unknown> & {
  business?: unknown;
  product?: unknown;
};

/**
 * Who is going to read this row.
 *
 * `'public'` — anyone on `/events`, `/events/[id]` or the `/explore` banner.
 * `'internal'` — the owner's own event list and the admin review queue.
 *
 * A named union rather than a boolean flag, because the call sites are where
 * this decision has to be legible.
 */
type EventAudience = 'public' | 'internal';

/** The promoted offering as SELECTED — `status` is read, then dropped. */
type ProductEmbed = NonNullable<EventWithRefs['product']> & { status: string };

/**
 * Shape one row for rendering: unwrap the to-one embeds, resolve the stored
 * image paths (both via the shared event-media helper), and decide whether the
 * promoted offering is one this audience should see.
 */
function normalise(
  supabase: StorageClient,
  row: EmbeddedRow,
  audience: EventAudience,
): EventWithRefs {
  const event = row as unknown as EventWithRefs;
  const { image_url, business, product } = resolveEventMedia<
    NonNullable<EventWithRefs['business']>,
    ProductEmbed
  >(supabase, row);

  // Products RLS (20260526000007) gates only `archived_at` and the shop being
  // verified — NOT `products.status`. So an offering the owner set to
  // `unlisted` or `disabled` is still readable, and `/events/[eventId]` renders
  // "Featuring <name>" straight from this field: without the gate, a public
  // event page advertises an offering the shop has taken down.
  //
  // Deliberately NOT applied to `'internal'`. The owner's list and the admin's
  // review queue are the two places where "this event promotes an offering you
  // have disabled" is the useful signal — hiding it there would turn a
  // diagnosable state into a silent one.
  //
  // `status` is dropped either way: `EventWithRefs['product']` does not declare
  // it, and returning an undeclared field is how the next reader starts
  // depending on it.
  const visibleProduct: EventWithRefs['product'] = product
    ? audience === 'internal' || product.status === 'active'
      ? { id: product.id, name: product.name, image_url: product.image_url }
      : null
    : null;

  return { ...event, image_url, business, product: visibleProduct };
}

const EMPTY_PAGE = (perPage: number): PaginatedEvents => ({
  events: [],
  metadata: { total: 0, page: 1, per_page: perPage, total_pages: 0 },
});

export type EventPageResult = PaginatedEvents & { error?: 'LOAD_FAILED' };

/**
 * The public list.
 *
 * `.eq('status', 'approved')` is NOT redundant with RLS, and the comment that
 * used to say it was is what made this wrong. Postgres OR's *permissive*
 * policies, and `events` carries three SELECT-capable ones: the public
 * approved-only policy, `"Owners view own events"` (no status filter at all)
 * and `"Admins manage all events"`. So for a signed-in owner this read
 * returned their own drafts and rejected proposals on the PUBLIC events page,
 * and for an admin it returned every unreviewed proposal in the system.
 *
 * RLS is the floor — what a caller may *never* see. It is not the filter for
 * what this particular surface *should* show.
 */
export async function getPublicEvents(
  filters: EventFilters = {},
): Promise<EventPageResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(1, filters.per_page ?? 12));
  const when = filters.when ?? 'upcoming';

  try {
    const supabase = await createServerSupabaseClient();
    const from = (page - 1) * perPage;

    let query = supabase
      .from('events')
      .select(SELECT_WITH_REFS, { count: 'exact' })
      .eq('status', 'approved')
      .is('archived_at', null);

    const nowIso = new Date().toISOString();
    if (when === 'upcoming') {
      // "Upcoming" includes what is on right now — an event that started an
      // hour ago is the most upcoming thing there is.
      query = query
        .gte('ends_at', nowIso)
        .order('starts_at', { ascending: true });
    } else if (when === 'past') {
      query = query
        .lt('ends_at', nowIso)
        .order('starts_at', { ascending: false });
    } else {
      query = query.order('starts_at', { ascending: false });
    }

    if (filters.search) {
      // Quoted + escaped: a raw term is interpolated into a filter STRING, so
      // a comma or a parenthesis rewrites the filter instead of being searched
      // for — and "Iznart St., Iloilo" is an entirely reasonable thing to type.
      const term = ilikePattern(filters.search);
      query = query.or(`name.ilike.${term},address.ilike.${term}`);
    }

    // Deterministic tie-break: two events can share a start time, and a list
    // that reshuffles between pages drops rows off the end of one and onto
    // the next.
    const { data, error, count } = await query
      .order('id', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[getPublicEvents]', describeDbError(error));
      return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
    }

    const total = count ?? 0;
    return {
      events: (data ?? []).map((row) =>
        normalise(supabase, row as EmbeddedRow, 'public'),
      ),
      metadata: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  } catch (err) {
    console.error('[getPublicEvents]', err);
    return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
  }
}

/**
 * The banner set: live and upcoming events, best first.
 *
 * Ordering by `starts_at` here and re-sorting in the component is deliberate —
 * "happening now first" depends on the daily window, which is a Manila-local
 * computation SQL would have to duplicate. The DB narrows, the pure helper
 * ranks. `limit` keeps the payload small; a banner nobody scrolls past ten
 * panels of is a banner nobody reads.
 */
export async function getBannerEvents(limit = 8): Promise<EventWithRefs[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('events')
      .select(SELECT_WITH_REFS)
      // Same reason as `getPublicEvents`: the owner and admin SELECT policies
      // are OR'd with the public one, so without this an owner browsing
      // /explore saw their OWN unreviewed event rendered as a published
      // banner — the exact thing the approval gate exists to prevent.
      .eq('status', 'approved')
      .is('archived_at', null)
      .gte('ends_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('starts_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getBannerEvents]', describeDbError(error));
      return [];
    }
    return (data ?? []).map((row) =>
      normalise(supabase, row as EmbeddedRow, 'public'),
    );
  } catch (err) {
    console.error('[getBannerEvents]', err);
    return [];
  }
}

export type EventDetailResult =
  | { event: EventWithRefs }
  | { error: 'NOT_FOUND' | 'LOAD_FAILED' };

/**
 * One event by id.
 *
 * `React.cache`d because `generateMetadata` and the page body both need it and
 * would otherwise fetch twice per request.
 *
 * NOT_FOUND and LOAD_FAILED are separate on purpose: collapsing them makes a
 * transient DB blip render as a 404, which tells crawlers a healthy event page
 * is gone.
 */
export const getEventById = cache(
  async (id: string): Promise<EventDetailResult> => {
    // Shape-checked before it reaches PostgREST. `/events/<junk>` otherwise
    // raises 22P02, which the caller reads as LOAD_FAILED and renders as
    // "couldn't load" with a 200 — a soft 404 on an enumerable public URL.
    if (!eventIdSchema.safeParse(id).success) return { error: 'NOT_FOUND' };

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('events')
        .select(SELECT_WITH_REFS)
        .eq('id', id)
        .is('archived_at', null)
        .maybeSingle();

      if (error) {
        console.error('[getEventById]', describeDbError(error));
        return { error: 'LOAD_FAILED' };
      }
      if (!data) return { error: 'NOT_FOUND' };

      return { event: normalise(supabase, data as EmbeddedRow, 'public') };
    } catch (err) {
      console.error('[getEventById]', err);
      return { error: 'LOAD_FAILED' };
    }
  },
);

/**
 * A shop's own events, in every status.
 *
 * RLS decides what comes back: the owner's SELECT policy covers their own
 * rows, and the admin policy covers everything — so this one function serves
 * both the owner's list and the admin's queue without a role branch.
 */
export async function getEventsForBusiness(
  businessId: string,
  filters: EventFilters = {},
): Promise<EventPageResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(1, filters.per_page ?? 12));

  if (!businessId) return EMPTY_PAGE(perPage);

  try {
    const supabase = await createServerSupabaseClient();
    const from = (page - 1) * perPage;

    let query = supabase
      .from('events')
      .select(SELECT_WITH_REFS, { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('starts_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[getEventsForBusiness]', describeDbError(error));
      return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
    }

    const total = count ?? 0;
    return {
      events: (data ?? []).map((row) =>
        normalise(supabase, row as EmbeddedRow, 'internal'),
      ),
      metadata: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  } catch (err) {
    console.error('[getEventsForBusiness]', err);
    return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
  }
}

/**
 * The admin review queue — every business's proposals, newest first.
 *
 * Relies on the admin RLS policy rather than a service-role client: an admin
 * reading admin-visible rows is exactly what that policy is for, and using
 * service-role here would mean this function returns everything to whoever
 * manages to call it.
 */
export async function getEventsForReview(
  filters: EventFilters = {},
): Promise<EventPageResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(1, filters.per_page ?? 12));

  try {
    const supabase = await createServerSupabaseClient();
    const from = (page - 1) * perPage;

    let query = supabase
      .from('events')
      .select(SELECT_WITH_REFS, { count: 'exact' })
      .is('archived_at', null);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[getEventsForReview]', describeDbError(error));
      return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
    }

    const total = count ?? 0;
    return {
      events: (data ?? []).map((row) =>
        normalise(supabase, row as EmbeddedRow, 'internal'),
      ),
      metadata: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  } catch (err) {
    console.error('[getEventsForReview]', err);
    return { ...EMPTY_PAGE(perPage), error: 'LOAD_FAILED' };
  }
}

/**
 * Status counts for the dashboard stat cards.
 *
 * Head-only counts, one per status, run in parallel — never
 * `select('status')` then `.filter().length`, which the PostgREST 1000-row cap
 * turns into a wrong number the moment a shop is busy (CLAUDE.md §API
 * standards). `businessId` omitted = every shop, which is the admin view; RLS
 * decides what the caller can actually see either way.
 *
 * A failed read reports `failed: true` rather than four confident zeros — an
 * outage and an empty catalogue look identical on a stat card otherwise.
 */
export async function getEventStats(businessId?: string): Promise<EventStats> {
  try {
    const supabase = await createServerSupabaseClient();

    /** The scope every count shares: live rows, optionally one shop's. */
    const scoped = () => {
      const query = supabase
        .from('events')
        // Count-only read: no row payload (repo count rule).
        .select('id', { count: 'exact', head: true })
        .is('archived_at', null);
      return businessId ? query.eq('business_id', businessId) : query;
    };

    const byStatus = async (status: EventStatus) => {
      const { count, error } = await scoped().eq('status', status);
      if (error) throw error;
      return count ?? 0;
    };

    const platformCount = async () => {
      const { count, error } = await scoped().is('business_id', null);
      if (error) throw error;
      return count ?? 0;
    };

    const [draft, pendingReview, approved, rejected, staffPicks] =
      await Promise.all([
        byStatus('draft'),
        byStatus('pending_review'),
        byStatus('approved'),
        byStatus('rejected'),
        // A platform event has no shop, so it can never fall inside a shop's
        // scope — the owner's card would always read 0. Don't ask.
        businessId ? Promise.resolve(0) : platformCount(),
      ]);

    return {
      total: draft + pendingReview + approved + rejected,
      draft,
      pending_review: pendingReview,
      approved,
      rejected,
      staff_picks: staffPicks,
      failed: false,
    };
  } catch (err) {
    console.error('[getEventStats]', describeDbError(err));
    return { ...EMPTY_EVENT_STATS, failed: true };
  }
}

/** Count of proposals waiting on a decision — the admin queue badge. */
export async function getPendingReviewCount(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();
    // Count-only read: no row payload (repo count rule).
    const { count, error } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')
      .is('archived_at', null);

    if (error) {
      console.error('[getPendingReviewCount]', describeDbError(error));
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error('[getPendingReviewCount]', err);
    return 0;
  }
}

/**
 * Events near a point, via the `events_nearby` RPC.
 *
 * The RPC restates the public visibility gate rather than inheriting it —
 * SECURITY DEFINER bypasses RLS — so nothing unapproved can reach here.
 */
export async function getNearbyEvents(
  lat: number,
  lng: number,
  radiusMeters = 20_000,
  limit = 24,
): Promise<{ events: NearbyEvent[]; error?: 'LOAD_FAILED' }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .rpc('events_nearby', {
        lat,
        lng,
        radius_meters: radiusMeters,
      })
      .limit(limit);

    if (error) {
      console.error('[getNearbyEvents]', describeDbError(error));
      return { events: [], error: 'LOAD_FAILED' };
    }
    return { events: (data ?? []) as NearbyEvent[] };
  } catch (err) {
    console.error('[getNearbyEvents]', err);
    return { events: [], error: 'LOAD_FAILED' };
  }
}
