import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Classification (flash/explore split, featured pick), the category filter, the
// is_subscribed sort, and pagination all run inside the `mobile_deals` Postgres
// RPC (migration 20260630000000) — the DB returns only the featured deal + flash
// list + the requested explore page, already ordered, instead of a 500-row scan
// the route then maps/filters/sorts in memory. The route's only remaining job is
// resolving the RAW storage paths the RPC returns into public URLs (keeping the
// env-specific storage base in app code, as the nearby route does).

type RawDeal = {
  business_logo_url: string | null;
  business_image_url: string | null;
  [key: string]: unknown;
};

type DealsPayload = {
  featured: RawDeal | null;
  flash: RawDeal[];
  explore: RawDeal[];
  explore_total: number;
  explore_page: number;
  explore_per_page: number;
  explore_has_more: boolean;
};

function resolveDealUrls(supabase: SupabaseClient, deal: RawDeal | null) {
  if (!deal) return null;
  return {
    ...deal,
    business_logo_url: resolveStorageUrl(
      supabase,
      'shop-logos',
      deal.business_logo_url,
    ),
    business_image_url: resolveStorageUrl(
      supabase,
      'interior-images',
      deal.business_image_url,
    ),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') ?? 'All';
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawPerPage = parseInt(searchParams.get('per_page') ?? '20', 10);
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const per_page = Math.min(
      50,
      Math.max(1, Number.isFinite(rawPerPage) ? rawPerPage : 20),
    );
    const search = (searchParams.get('q') ?? '').trim();

    const supabase = createBearerClient();

    const { data, error } = await supabase.rpc('mobile_deals', {
      p_category: category,
      p_search: search,
      p_page: page,
      p_per_page: per_page,
    });

    if (error) {
      return loggedServerError('mobile/deals', error);
    }

    // mobile_deals always returns a non-null jsonb object (flash/explore are
    // COALESCE'd to '[]'); this guard is belt-and-suspenders against an
    // unexpected null so the .map() calls below can't throw.
    const payload = (data ?? {
      featured: null,
      flash: [],
      explore: [],
      explore_total: 0,
      explore_page: 1,
      explore_per_page: 20,
      explore_has_more: false,
    }) as DealsPayload;

    return successResponse({
      featured: resolveDealUrls(supabase, payload.featured),
      flash: payload.flash.map((d) => resolveDealUrls(supabase, d)),
      explore: payload.explore.map((d) => resolveDealUrls(supabase, d)),
      explore_total: payload.explore_total,
      explore_page: payload.explore_page,
      explore_per_page: payload.explore_per_page,
      explore_has_more: payload.explore_has_more,
    });
  } catch {
    return generalErrorResponse();
  }
}
