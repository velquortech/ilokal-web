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

/**
 * Events near a point.
 *
 * This is the PULL half of "tell me about events near me". There is no push
 * infrastructure in this repo — no device-token table, no provider, no worker,
 * and `profiles` stores no location — so the client asks, holding its own
 * coordinates. Background push is a separate piece of infrastructure, not a
 * flag away.
 *
 * ── Why two queries ─────────────────────────────────────────────────────────
 *
 * `events_nearby` is a narrow, flat projection: 12 columns, a `business_name`
 * string and no `product`, no `status`, no lat/lng, no link/ticket URLs. That
 * is NOT the shape mobile parses — `eventsResponseSchema` (the mobile repo's
 * `schemas/events.ts`, commented "also the nearby shape") requires the full
 * `MobileEventWithRefs`, with `business` and `product` as OBJECTS and nine
 * further keys as required-nullable. Nullable is not optional, so the flat row
 * would fail `parseOrThrow` outright.
 *
 * The fix deliberately does NOT widen the RPC. Changing a `RETURNS TABLE`
 * needs DROP + CREATE rather than `CREATE OR REPLACE`, which means a HIGH-risk
 * migration onto a cloud queue that is already deep, plus a window where anon
 * callers get PGRST202 — the hazard the `public_feature_flags` rollout already
 * recorded. Worse, it would spell the mobile column list out a SECOND time, in
 * SQL, where nothing keeps it in step with `MOBILE_EVENT_SELECT`.
 *
 * So the RPC keeps doing the one thing only PostGIS can do — rank ids by
 * distance, inside the radius, with the visibility gate restated (SECURITY
 * DEFINER bypasses RLS) — and this route hydrates that page of ids through the
 * SAME projection the list and detail routes use. Nearby therefore inherits
 * the column contract rather than restating it, and the second read is a
 * primary-key lookup bounded by `per_page` (≤ 50).
 */

/** What the RPC itself returns, per row — narrow by design. */
type NearbyRpcRow = {
  id: string;
  distance_meters: number;
};

/**
 * One emitted row: the shared mobile event shape plus the distance the RPC
 * ranked by. Named so the drop-a-missing-row filter can state what survives —
 * a bare `Record<string, unknown>` would not carry `distance_meters`, which is
 * the one field this endpoint exists to add.
 */
type EmittedNearbyRow = Record<string, unknown> & { distance_meters: number };

export async function GET(req: NextRequest) {
  try {
    // Same kill switch as every other surface. An endpoint that keeps serving
    // while the feature is "off" is not off. The empty payload is a valid
    // `eventsResponseSchema` document, so mobile renders an empty feed rather
    // than throwing at a parse failure.
    if (!(await getEventsEnabled())) {
      return successResponse({ events: [], total: 0, has_more: false });
    }

    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return badRequestResponse({
        message: 'lat and lng query params are required',
      });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return badRequestResponse({
        message: 'lat and lng must be valid coordinates',
      });
    }

    const radiusRaw = parseInt(searchParams.get('radius') ?? '20000', 10);
    const radius = Math.min(
      100_000,
      Math.max(100, Number.isFinite(radiusRaw) ? radiusRaw : 20_000),
    );

    const page = Math.max(
      1,
      parseInt(searchParams.get('page') ?? '1', 10) || 1,
    );
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '20', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 20),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const supabase = createBearerClient();

    // 1. Rank. `.range()` on the RPC relation rather than fetch-all-then-slice:
    //    the PostgREST cap is 1000 rows, and paginating in Node silently
    //    truncates past it.
    const {
      data: rankedData,
      error,
      count,
    } = await supabase
      .rpc(
        'events_nearby',
        { lat, lng, radius_meters: radius },
        { count: 'exact' },
      )
      .range(from, to);

    if (error) {
      return loggedServerError('mobile/events/nearby', error);
    }

    const ranked = (rankedData ?? []) as unknown as NearbyRpcRow[];
    const total = count ?? ranked.length;

    if (ranked.length === 0) {
      return successResponse({ events: [], total, has_more: false });
    }

    // 2. Hydrate, through the shared mobile contract.
    //
    //    The status/archived filters are restated rather than left to RLS, for
    //    the same reason the list route restates them: `events` carries three
    //    SELECT-capable policies and the owner one has no status filter at all.
    //    Belt and braces here, since the RPC already gated the id set.
    const { data: rowData, error: rowsError } = await supabase
      .from('events')
      .select(MOBILE_EVENT_SELECT)
      .in(
        'id',
        ranked.map((row) => row.id),
      )
      .eq('status', 'approved')
      .is('archived_at', null);

    if (rowsError) {
      return loggedServerError('mobile/events/nearby', rowsError);
    }

    // 3. Merge. `.in()` answers in arbitrary order, and distance ordering IS
    //    the point of this endpoint — so the RPC's sequence drives the output
    //    and the hydrated rows are looked up against it.
    const byId = new Map<string, MobileEventRow>(
      ((rowData ?? []) as unknown as MobileEventRow[]).map((row) => [
        row.id as string,
        row,
      ]),
    );

    const events = ranked
      .map((near) => {
        const full = byId.get(near.id);
        // A row the RPC ranked but the hydrate did not return was archived
        // between the two reads. Dropping it keeps every emitted row a
        // COMPLETE `MobileEventWithRefs`; emitting a partial one would fail
        // the client's parse and take the whole page down with it.
        if (!full) return null;
        return {
          ...normaliseMobileEvent(supabase, full),
          distance_meters: near.distance_meters,
        };
      })
      .filter((event): event is EmittedNearbyRow => event !== null);

    return successResponse({
      events,
      total,
      // Deliberately `ranked.length`, not `events.length`: pagination advances
      // by what the RPC ranked. Measuring the dropped-row case would make a
      // single archived event look like the end of the feed.
      has_more: from + ranked.length < total,
    });
  } catch {
    return generalErrorResponse();
  }
}
