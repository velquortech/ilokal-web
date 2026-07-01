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
const CATEGORY_TO_BUSINESS_TYPE: Record<string, string> = {
  Food: 'Food & Beverage',
  Retail: 'Retail',
  Services: 'Services',
  Tourism: 'Tourism & Leisure',
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

    // Server-side filters (Explore tab). Filtering at the DB keeps the paged
    // payload to a real screenful instead of shipping every match to the client.
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
    const to = from + perPage - 1;

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

    // PostgREST treats the set-returning RPC as a relation, so category/search
    // filters, ordering and range pagination apply on top of it without a DB
    // function change. `count: 'exact'` backs `has_more`.
    let query = supabase.rpc(
      'nearby_businesses',
      { lat, lng, radius_meters: radius },
      paginated ? { count: 'exact' } : {},
    );

    if (category) {
      query = query.eq('business_type', CATEGORY_TO_BUSINESS_TYPE[category]);
    }
    if (subcategory && subcategory !== 'All') {
      query = query.eq('category_name', subcategory);
    }
    if (search) {
      // Match free text across name, business type, sub-category, and
      // description so a category-ish query ("restaurant", "salon") or a
      // descriptive word ("coffee") works — not just exact names. Strip the
      // chars PostgREST uses as `.or()` delimiters so a stray comma/paren can't
      // break the filter. AND-ed with any selected category/sub-category above.
      const s = search.replace(/[,()]/g, ' ').trim();
      if (s) {
        query = query.or(
          `business_name.ilike.%${s}%,` +
            `business_type.ilike.%${s}%,` +
            `category_name.ilike.%${s}%,` +
            `business_description.ilike.%${s}%`,
        );
      }
    }

    if (paginated) {
      query = query
        .order('distance_meters', { ascending: true })
        .range(from, to);
    } else if (limit != null) {
      // Cap result rows when a `limit` is given (e.g. Home's nearest-few
      // preview) so we never transfer every business just to show a handful.
      // Order by is_featured first — matches nearby_businesses' own intended
      // order (promoted shops surface before the distance cutoff trims rows).
      query = query
        .order('is_featured', { ascending: false })
        .order('distance_meters', { ascending: true })
        .limit(limit);
    }

    const { data, error, count } = await query;

    if (error) {
      return loggedServerError('mobile/businesses/nearby', error);
    }

    const businessIds: string[] = data.map(
      (b: Record<string, unknown>) => b.business_id as string,
    );

    // Ratings (tallied client-side) + follower counts (aggregated by the
    // get_follower_counts RPC, which keeps the follow graph private). Both keyed
    // on the same business ids, so fetch in parallel.
    const [{ data: ratingsData }, { data: followerCounts }] = await Promise.all(
      [
        supabase
          .from('business_ratings')
          .select('business_id, rating')
          .in('business_id', businessIds),
        supabase.rpc('get_follower_counts', { p_business_ids: businessIds }),
      ],
    );

    const ratingsMap = new Map<string, { sum: number; count: number }>();
    for (const r of ratingsData ?? []) {
      const entry = ratingsMap.get(r.business_id) ?? { sum: 0, count: 0 };
      entry.sum += r.rating;
      entry.count += 1;
      ratingsMap.set(r.business_id, entry);
    }

    const followersMap = new Map<string, number>();
    for (const f of (followerCounts ?? []) as {
      business_id: string;
      follower_count: number;
    }[]) {
      followersMap.set(f.business_id, Number(f.follower_count));
    }

    const businesses = data.map((b: Record<string, unknown>) => {
      const stats = ratingsMap.get(b.business_id as string);
      return {
        ...b,
        logo_url: resolveStorageUrl(
          supabase,
          'shop-logos',
          b.logo_url as string | null,
        ),
        interior_images:
          (b.interior_images as string[] | null)?.map((url) =>
            resolveStorageUrl(supabase, 'interior-images', url),
          ) ?? [],
        average_rating: stats
          ? Math.round((stats.sum / stats.count) * 10) / 10
          : 0,
        rating_count: stats?.count ?? 0,
        total_followers: followersMap.get(b.business_id as string) ?? 0,
      };
    });

    if (paginated) {
      const total = count ?? businesses.length;
      return successResponse({
        businesses,
        total,
        has_more: from + businesses.length < total,
      });
    }

    return successResponse({ businesses });
  } catch {
    return generalErrorResponse();
  }
}
