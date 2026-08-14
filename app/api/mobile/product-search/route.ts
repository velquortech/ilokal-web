import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  successResponse,
  loggedServerError,
  generalErrorResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Same wire row as the popular-products feed (20260814020000), so the mobile
// app reuses mapWireToPopularProduct unchanged.
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
};

// Resolve the three image fields into public URLs and normalise PostgREST's
// numeric-as-string/BIGINT representations — the same rules the nearby and
// popular-products routes apply.
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

// GET /api/mobile/product-search — the Home search bar's full-catalog product
// probe (ilokal-mobile hooks/useSearchSuggestions.ts). Unlike
// /mobile/popular-products, this ranks by RELEVANCE across EVERY available
// product of every verified business, not by trend score within the trending
// pool — so a long-tail product with a handful of views is still findable.
// One product per business, relevance-first (name-prefix > substring, then
// views/ratings), so the three suggestion slots stay varied.
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('q')?.trim();
    if (!search) {
      return badRequestResponse({ message: 'q query param is required' });
    }
    const limitRaw = parseInt(
      req.nextUrl.searchParams.get('limit') ?? '10',
      10,
    );
    const limit = Math.min(
      20,
      Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10),
    );

    const supabase = createBearerClient();
    const { data, error } = await supabase.rpc('product_search', {
      search,
      limit_count: limit,
    });

    if (error) {
      return loggedServerError('mobile/product-search', error);
    }

    const rows = (data ?? []) as RawRow[];
    return successResponse({
      products: rows.map((row) => mapRow(supabase, row)),
    });
  } catch {
    return generalErrorResponse();
  }
}
