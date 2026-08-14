import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Maps the mobile category key → business_types.name in the DB (mirror of the
// nearby + deals routes). Unknown keys yield an empty result rather than all
// results. The four launch verticals (20260815000000) joined the taxonomy
// 2026-08-14; Tourism stays mapped so an older app build can't turn it into a
// dead filter until the vertical is removed from the maps too.
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

// The rail cap — the wire's counterpart of the client scan's FRESH_POOL_SEATS
// (the board shows up to this many items from fresh businesses or launch-week
// products; the route then dedups page-1 grid members out of the result).
const FRESH_LIMIT = 5;

type RawRow = {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  price: number | string;
  price_type: string;
  price_unit: string | null;
  weekly_view_count: number | null;
  average_rating: number | string;
  rating_count: number | string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  business_banner_url: string | null;
  distance_meters: number | null;
  is_new: boolean;
  total_count?: number | string;
};

// Resolve the three image fields into public URLs (the RPC returns raw storage
// paths) and normalise PostgREST's numeric-as-string/BIGINT representations —
// the same rules the nearby route applies.
function mapRow(supabase: SupabaseClient, row: RawRow) {
  return {
    ...row,
    product_image_url: resolveStorageUrl(
      supabase,
      'product-images',
      row.product_image_url,
    ),
    business_logo_url: resolveStorageUrl(
      supabase,
      'shop-logos',
      row.business_logo_url,
    ),
    business_banner_url: resolveStorageUrl(
      supabase,
      'shop-banners',
      row.business_banner_url,
    ),
    price: Number(row.price),
    average_rating: Number(row.average_rating ?? 0),
    rating_count: Number(row.rating_count ?? 0),
    distance_meters: row.distance_meters,
  };
}

// GET /api/mobile/popular-products — the Bida Ngayon board (ilokal-mobile
// app/bida-ngayon.tsx + Home's row, via hooks/home/usePopularProducts.ts).
//
// The heavy lifting (filter → one-best-product-per-business → rank across the
// whole filtered universe → page slice → match total) runs inside the
// popular_products_feed RPC so the route's only jobs are validating params,
// resolving storage URLs, and echoing paging metadata. The fresh tier is a
// page-1 concept: one extra RPC on page 1, omitted on later pages, and a
// failing fresh RPC must never fail the ranked board (fresh hides instead).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseInt(searchParams.get('radius') ?? '0', 10);
    const category = searchParams.get('category'); // mobile key: Food | Retail | …
    const subcategory = searchParams.get('subcategory'); // business_categories.name
    const search = searchParams.get('q')?.trim();
    const page = Math.max(
      1,
      parseInt(searchParams.get('page') ?? '1', 10) || 1,
    );
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '10', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 10),
    );
    const offset = (page - 1) * perPage;

    if (isNaN(lat) || isNaN(lng)) {
      return badRequestResponse({
        message: 'lat and lng query params are required',
      });
    }

    // Unknown category key → empty result (matches the nearby route contract).
    if (category && !CATEGORY_TO_BUSINESS_TYPE[category]) {
      return successResponse({
        products: [],
        total: 0,
        page,
        per_page: perPage,
        has_more: false,
      });
    }

    const supabase = createBearerClient();

    const { data, error } = await supabase.rpc('popular_products_feed', {
      lat,
      lng,
      radius_meters: Number.isFinite(radius) ? radius : 0,
      filter_business_type: category
        ? CATEGORY_TO_BUSINESS_TYPE[category]
        : null,
      filter_category_name:
        subcategory && subcategory !== 'All' ? subcategory : null,
      search: search || null,
      page_size: perPage,
      page_offset: offset,
    });

    if (error) {
      return loggedServerError('mobile/popular-products', error);
    }

    const rows = (data ?? []) as RawRow[];
    // total_count rides every row of the page (COUNT(*) OVER the filtered set,
    // before pagination) — read it from the first row.
    const total = Number(rows[0]?.total_count ?? rows.length);
    const products = rows.map((row) => mapRow(supabase, row));

    const payload: Record<string, unknown> = {
      products,
      total,
      page,
      per_page: perPage,
      has_more: offset + products.length < total,
    };

    if (page === 1) {
      const { data: freshRows, error: freshError } = await supabase.rpc(
        'popular_fresh_products',
        {
          lat,
          lng,
          radius_meters: Number.isFinite(radius) ? radius : 0,
          filter_business_type: category
            ? CATEGORY_TO_BUSINESS_TYPE[category]
            : null,
          filter_category_name:
            subcategory && subcategory !== 'All' ? subcategory : null,
          search: search || null,
          limit_count: FRESH_LIMIT,
        },
      );
      // The rail is the "beyond the grid" shelf: a fresh product that already
      // ranks on page 1 shows its NEW chip in the grid and must NOT also
      // appear in the rail (mirrors the client scan's no-duplication split —
      // see usePopularProducts scanFresh). The widened tier (20260814120000)
      // lets launch-week products at established businesses rank high, so the
      // dedup is what keeps a grid-topper like "Clothing Alteration" from
      // rendering twice on the board.
      const gridIds = new Set(products.map((p) => p.product_id));
      payload.fresh = freshError
        ? []
        : ((freshRows ?? []) as RawRow[])
            .filter((row) => !gridIds.has(row.product_id))
            .map((row) => mapRow(supabase, row));

      // Bida of the Day — the editorial daily star leading the hero rotation
      // (20260814130000). The RPC already applies the current filters, so a
      // pick that doesn't qualify for this view (wrong category, out of
      // radius, …) comes back empty and the hero falls back to the plain
      // top-5 rotation. A failing RPC must never take the board down.
      const { data: bidaRows, error: bidaError } = await supabase.rpc(
        'bida_of_the_day',
        {
          lat,
          lng,
          radius_meters: Number.isFinite(radius) ? radius : 0,
          filter_business_type: category
            ? CATEGORY_TO_BUSINESS_TYPE[category]
            : null,
          filter_category_name:
            subcategory && subcategory !== 'All' ? subcategory : null,
          search: search || null,
        },
      );
      const bidaRow = (bidaRows ?? []) as RawRow[];
      payload.bida_of_the_day =
        bidaError || bidaRow.length === 0 ? null : mapRow(supabase, bidaRow[0]);
    }

    return successResponse(payload);
  } catch {
    return generalErrorResponse();
  }
}
