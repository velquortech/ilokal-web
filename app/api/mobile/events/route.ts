import { NextRequest } from 'next/server';
import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import {
  MOBILE_EVENT_SELECT,
  normaliseMobileEvent,
  type MobileEventRow,
} from '@/app/api/helpers/mobileEvent';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { ilikePattern } from '@/lib/utils/postgrestSearch';
import { EVENT_TIME_FILTERS } from '@/lib/types';
import type { EventTimeFilter } from '@/lib/types';

/**
 * GET /api/mobile/events — the browse feed.
 *
 * The non-location counterpart to `events/nearby`, and the endpoint mobile's
 * `fetchEvents()` (services/events.ts) actually calls, with `when`, `page`,
 * `per_page` and `q`.
 *
 * ── On duplicating `getPublicEvents` ────────────────────────────────────────
 *
 * The filter set here matches `lib/api/events/eventQuery.getPublicEvents`, and
 * that is deliberate duplication of the kind CLAUDE.md §DRY asks to be
 * justified in a comment. The two callers differ in ways that go all the way
 * down: `getPublicEvents` builds on `createServerSupabaseClient()` (the COOKIE
 * client, so RLS resolves for a signed-in web visitor) and returns
 * `PaginatedEvents` with `metadata.total_pages` for the web pager, while this
 * route needs the cookie-less `createBearerClient()` and the flat
 * `{ events, total, has_more }` envelope mobile's Zod schema pins.
 *
 * What is genuinely shared — the projection and the row shaping — IS shared,
 * via `MOBILE_EVENT_SELECT` / `normaliseMobileEvent`. That is the part that
 * drifts silently; a `.eq('status', 'approved')` that goes missing does not.
 *
 * Both gates are kept explicitly rather than left to RLS: `events` carries
 * three SELECT-capable policies, and the owner one has no status filter at
 * all, so a read that leans on RLS alone returns an owner their own drafts on
 * a public surface. The anon bearer client cannot hit that policy today, which
 * is precisely why the filter has to be written down — it is the thing keeping
 * a future authenticated caller honest.
 */

export async function GET(req: NextRequest) {
  try {
    // The kill switch, before any DB work. An endpoint still serving while the
    // feature is "off" is not off. The empty payload is a VALID
    // `eventsResponseSchema` document, so mobile renders an empty feed rather
    // than throwing `INVALID_RESPONSE` at a parse failure.
    if (!(await getEventsEnabled())) {
      return successResponse({ events: [], total: 0, has_more: false });
    }

    const { searchParams } = req.nextUrl;

    // Read off the shared constant rather than a literal list — the union and
    // the runtime check cannot drift if a fourth filter is ever added.
    const when = (searchParams.get('when') ?? 'upcoming') as EventTimeFilter;
    if (!EVENT_TIME_FILTERS.includes(when)) {
      return badRequestResponse({
        message: `when must be one of ${EVENT_TIME_FILTERS.join(', ')}`,
      });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '20', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 20),
    );
    const search = (searchParams.get('q') ?? '').trim();
    const from = (page - 1) * perPage;

    const supabase = createBearerClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('events')
      .select(MOBILE_EVENT_SELECT, { count: 'exact' })
      .eq('status', 'approved')
      .is('archived_at', null);

    if (when === 'upcoming') {
      // "Upcoming" includes what is on RIGHT NOW — an event that started an
      // hour ago is the most upcoming thing there is. Filtering on `starts_at`
      // instead would hide every event the moment it began.
      query = query.gte('ends_at', nowIso).order('starts_at', {
        ascending: true,
      });
    } else if (when === 'past') {
      query = query.lt('ends_at', nowIso).order('starts_at', {
        ascending: false,
      });
    } else {
      query = query.order('starts_at', { ascending: false });
    }

    if (search) {
      // Quoted + escaped: the term is interpolated into a filter STRING, so a
      // bare comma or parenthesis rewrites the filter instead of being
      // searched for — and "Iznart St., Iloilo" is a reasonable thing to type.
      const term = ilikePattern(search);
      query = query.or(`name.ilike.${term},address.ilike.${term}`);
    }

    // Deterministic tie-break. Two events can share a start time, and a list
    // that reshuffles between requests drops rows off the end of one page and
    // onto the next — which mobile, appending pages, would show as a gap.
    //
    // `.range()` rather than fetch-all-then-slice: PostgREST caps a response at
    // 1000 rows, so paginating in Node silently lies past that.
    const { data, error, count } = await query
      .order('id', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) {
      return loggedServerError('mobile/events', error);
    }

    const rows = (data ?? []) as unknown as MobileEventRow[];
    const events = rows.map((row) => normaliseMobileEvent(supabase, row));
    const total = count ?? events.length;

    return successResponse({
      events,
      total,
      has_more: from + events.length < total,
    });
  } catch {
    return generalErrorResponse();
  }
}
