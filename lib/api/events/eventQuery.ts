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
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { describeDbError } from '@/lib/utils/describeDbError';
import type {
  EventFilters,
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
  product:products ( id, name, image_url )
`;

type EmbeddedRow = Record<string, unknown> & {
  business?: unknown;
  product?: unknown;
};

function firstOrNull<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

type StorageClient = Parameters<typeof resolveStorageUrl>[0];

/**
 * Shape one row for rendering.
 *
 * Two things happen here, both of which look optional until they bite:
 *
 * 1. `business` and `product` are to-one embeds, which PostgREST returns as
 *    ARRAYS. Reading `.shop_name` off an array yields undefined and renders as
 *    a shop with no name.
 * 2. Image columns hold RAW STORAGE PATHS. `uploadWebP` returns `data.path`,
 *    so a real upload stores `<businessId>/<file>.webp` — handing that to
 *    `next/image` produces a relative URL that 404s. Seeds store full URLs
 *    instead, and `resolveStorageUrl` passes those through untouched, so one
 *    call covers both.
 */
function normalise(supabase: StorageClient, row: EmbeddedRow): EventWithRefs {
  const event = row as unknown as EventWithRefs;
  const business = firstOrNull<EventWithRefs['business']>(row.business);
  const product = firstOrNull<EventWithRefs['product']>(row.product);

  return {
    ...event,
    image_url: resolveStorageUrl(supabase, 'event-images', event.image_url),
    business: business
      ? {
          ...business,
          logo_url: resolveStorageUrl(
            supabase,
            'shop-logos',
            business.logo_url,
          ),
        }
      : null,
    product: product
      ? {
          ...product,
          image_url: resolveStorageUrl(
            supabase,
            'product-images',
            product.image_url,
          ),
        }
      : null,
  };
}

const EMPTY_PAGE = (perPage: number): PaginatedEvents => ({
  events: [],
  metadata: { total: 0, page: 1, per_page: perPage, total_pages: 0 },
});

export type EventPageResult = PaginatedEvents & { error?: 'LOAD_FAILED' };

/**
 * The public list. RLS already restricts this to approved, non-archived events
 * of live shops, so the filter here is about TIME, not permission — never
 * rely on a `.eq('status', …)` in application code for that.
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
      const term = `%${filters.search}%`;
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
        normalise(supabase, row as EmbeddedRow),
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
    return (data ?? []).map((row) => normalise(supabase, row as EmbeddedRow));
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
    if (!id) return { error: 'NOT_FOUND' };

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

      return { event: normalise(supabase, data as EmbeddedRow) };
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
        normalise(supabase, row as EmbeddedRow),
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
        normalise(supabase, row as EmbeddedRow),
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
