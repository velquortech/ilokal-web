import { NextRequest } from 'next/server';
import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { getEventsEnabled } from '@/lib/api/appSettings';

/**
 * Events near a point.
 *
 * This is the PULL half of "tell me about events near me". There is no push
 * infrastructure in this repo — no device-token table, no provider, no worker,
 * and `profiles` stores no location — so the client asks, holding its own
 * coordinates. Background push is a separate piece of infrastructure, not a
 * flag away (see `.claude/EVENTS.md` D7).
 *
 * Mirrors `businesses/nearby`: the RPC is a set-returning function, so
 * PostgREST treats it as a relation and `.range()` paginates it without a DB
 * change. The RPC restates the public visibility gate itself — SECURITY
 * DEFINER bypasses RLS — so nothing unapproved can arrive here.
 */
export async function GET(req: NextRequest) {
  try {
    // Same kill switch as every other surface. An endpoint that keeps serving
    // while the feature is "off" is not off.
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

    // `.range()` on the RPC relation rather than fetch-all-then-slice: the
    // PostgREST cap is 1000 rows, and paginating in Node silently truncates
    // past it.
    const { data, error, count } = await supabase
      .rpc(
        'events_nearby',
        { lat, lng, radius_meters: radius },
        { count: 'exact' },
      )
      .range(from, to);

    if (error) {
      return loggedServerError('mobile/events/nearby', error);
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    const events = rows.map((row) => ({
      ...row,
      // Seeds store full public URLs, real uploads store raw in-bucket paths —
      // returning the raw value yields a broken image.
      image_url: resolveStorageUrl(
        supabase,
        'event-images',
        row.image_url as string | null,
      ),
    }));

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
