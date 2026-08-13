import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

// Maps the mobile category key → business_types.name in the DB (mirror of the
// popular-products route). Unknown keys yield an empty result.
const CATEGORY_TO_BUSINESS_TYPE: Record<string, string> = {
  Food: 'Food & Beverage',
  Retail: 'Retail',
  Services: 'Services',
  Tourism: 'Tourism & Leisure',
};

type FacetRow = {
  category_name: string;
  product_count: number | string;
};

// GET /api/mobile/popular-products/facets?lat&lng&radius&category&q — the
// per-sub-category product counts for the Bida Ngayon board's Sub-category
// sheet (ilokal-mobile app/bida-ngayon.tsx). The board fetches this only when
// a parent type is picked (the dropdown renders then), so the default board
// load never pays for it. The universe mirrors popular_products_feed's
// filters (verified/available/radius/business-type/search); counts are per
// business_categories.name.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseInt(searchParams.get('radius') ?? '0', 10);
    const category = searchParams.get('category'); // mobile key: Food | Retail | …
    const search = searchParams.get('q')?.trim();

    if (isNaN(lat) || isNaN(lng)) {
      return badRequestResponse({
        message: 'lat and lng query params are required',
      });
    }

    // Unknown category key → empty facets (matches the popular-products route).
    if (category && !CATEGORY_TO_BUSINESS_TYPE[category]) {
      return successResponse({ facets: [] });
    }

    const supabase = createBearerClient();

    const { data, error } = await supabase.rpc('popular_products_facets', {
      lat,
      lng,
      radius_meters: Number.isFinite(radius) ? radius : 0,
      filter_business_type: category
        ? CATEGORY_TO_BUSINESS_TYPE[category]
        : null,
      search: search || null,
    });

    if (error) {
      return loggedServerError('mobile/popular-products/facets', error);
    }

    const rows = (data ?? []) as FacetRow[];
    // Normalise PostgREST's BIGINT-as-string representation, same as the
    // popular-products route does for its numeric columns.
    const facets = rows.map((row) => ({
      name: row.category_name,
      count: Number(row.product_count),
    }));

    return successResponse({ facets });
  } catch {
    // Match the sibling routes: unexpected failures surface as a generic 500
    // (RPC errors are already logged above via loggedServerError).
    return generalErrorResponse();
  }
}
