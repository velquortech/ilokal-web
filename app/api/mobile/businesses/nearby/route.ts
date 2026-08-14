import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

// Maps the mobile category key → business_types.name in the DB (mirror of the
// deals route). Unknown keys yield an empty result rather than all results.
// The four launch verticals (20260815000000) joined the taxonomy 2026-08-14;
// Tourism stays mapped so an older app build can't turn it into a dead filter
// until the vertical is removed from the maps too.
const CATEGORY_TO_BUSINESS_TYPE: Record<string, string> = {
  Food: 'Food & Beverage',
  Retail: 'Retail',
  Services: 'Services',
  Tourism: 'Tourism & Leisure',
  Entertainment: 'Entertainment & Events',
  Health: 'Health & Wellness',
  Education: 'Education & Learning',
  Home: 'Home & Property Services',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseInt(searchParams.get('radius') ?? '5000', 10);
    const limitParam = parseInt(searchParams.get('limit') ?? '', 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;

    // Server-side filters (Explore tab). Filtering happens inside the
    // nearby_businesses_filtered RPC — before any aggregation — so a one-page
    // browse of a single category never computes the whole radius.
    const category = searchParams.get('category'); // mobile key: Food | Retail | …
    const subcategory = searchParams.get('subcategory'); // business_categories.name
    const search = searchParams.get('q')?.trim();

    // Page-based browse (Explore). When `page` is absent the response is the
    // legacy single-batch shape (Home's nearest-few preview, via `limit`).
    const pageParam = searchParams.get('page');
    const paginated = pageParam != null;
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '10', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 10),
    );
    const from = (page - 1) * perPage;

    if (isNaN(lat) || isNaN(lng)) {
      return badRequestResponse({
        message: 'lat and lng query params are required',
      });
    }

    // Unknown category key → empty result (matches the deals route contract).
    if (category && !CATEGORY_TO_BUSINESS_TYPE[category]) {
      return successResponse(
        paginated
          ? { businesses: [], has_more: false, total: 0 }
          : { businesses: [] },
      );
    }

    const supabase = createBearerClient();

    // One round-trip: the RPC filters (category/sub-category/search), orders,
    // pages, tallies the match total (COUNT(*) OVER → total_count) and joins
    // ratings only for the returned page. No PostgREST filter chain, no exact
    // count pass, no client-side filtering — the DB returns one screenful.
    //
    // Legacy (non-paginated) shape: with a `limit` it returns that many rows
    // featured-first (Home's nearest-few preview). Without `page` AND without
    // `limit` it must return ALL matching rows (the web "Shops near me" page) —
    // so we pass a NULL page_size, which the RPC treats as "no LIMIT".
    const { data, error } = await supabase.rpc('nearby_businesses_filtered', {
      lat,
      lng,
      radius_meters: radius,
      filter_business_type: category
        ? CATEGORY_TO_BUSINESS_TYPE[category]
        : null,
      filter_category_name:
        subcategory && subcategory !== 'All' ? subcategory : null,
      search: search || null,
      page_size: paginated ? perPage : limit,
      page_offset: paginated ? from : 0,
      sort_featured_first: !paginated && limit != null,
    });

    if (error) {
      return loggedServerError('mobile/businesses/nearby', error);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const businessIds: string[] = rows.map((b) => b.business_id as string);

    // Follower counts (aggregated by the get_follower_counts RPC, which keeps
    // the follow graph private) + the per-type availability aggregate for
    // Explore's category filters. Both keyed on the same location/radius, so
    // fetch in parallel. The counts RPC deliberately ignores category /
    // sub-category / search: availability is a property of the area, so the
    // dropdown never depends on the rows the active filter happens to return.
    // Ratings travel with the feed rows now — no separate ratings fetch.
    const [{ data: followerCounts }, { data: categoryCounts }] =
      await Promise.all([
        supabase.rpc('get_follower_counts', { p_business_ids: businessIds }),
        supabase.rpc('nearby_business_type_counts', {
          lat,
          lng,
          radius_meters: radius,
        }),
      ]);

    // PostgREST returns BIGINT as a string — normalise to numbers.
    const category_counts = (
      (categoryCounts ?? []) as {
        business_type: string | null;
        category_name: string | null;
        count: number | string;
      }[]
    ).map((c) => ({
      business_type: c.business_type,
      category_name: c.category_name,
      count: Number(c.count),
    }));

    const followersMap = new Map<string, number>();
    for (const f of (followerCounts ?? []) as {
      business_id: string;
      follower_count: number;
    }[]) {
      followersMap.set(f.business_id, Number(f.follower_count));
    }

    const businesses = rows.map((b) => ({
      ...b,
      logo_url: resolveStorageUrl(
        supabase,
        'shop-logos',
        b.logo_url as string | null,
      ),
      banner_url: resolveStorageUrl(
        supabase,
        'shop-banners',
        b.banner_url as string | null,
      ),
      interior_images:
        (b.interior_images as string[] | null)?.map((url) =>
          resolveStorageUrl(supabase, 'interior-images', url),
        ) ?? [],
      // PostgREST serialises BIGINT (rating_count) as a string — normalise to
      // a number, exactly like `count` and `follower_count` above. average_rating
      // (NUMERIC) is already a JSON number, but normalise it too so the contract
      // is stable regardless of how the column type is represented.
      average_rating: Number(b.average_rating ?? 0),
      rating_count: Number(b.rating_count ?? 0),
      total_followers: followersMap.get(b.business_id as string) ?? 0,
    }));

    if (paginated) {
      // total_count rides every row of the page (COUNT(*) OVER the filtered
      // set, before pagination) — read it from the first row.
      const total = Number(rows[0]?.total_count ?? businesses.length);
      return successResponse({
        businesses,
        total,
        has_more: from + businesses.length < total,
        category_counts,
      });
    }

    return successResponse({ businesses, category_counts });
  } catch {
    return generalErrorResponse();
  }
}
