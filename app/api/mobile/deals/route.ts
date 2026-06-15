import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

const FLASH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Safety cap on the coupons scan. Classification (flash/explore/featured) and
// the subscribed-first sort happen in-app after the query, so we can't push the
// page bound into the DB via .range() yet (see deals tech-debt, approach B).
// This bounds the scan so it can't grow with the full catalog. Coupons are
// ordered most-redeemed first, so the cap keeps the highest-signal deals.
const MAX_DEALS_SCAN = 500;

// Maps mobile category key → business_types.name in the DB
const CATEGORY_TO_BUSINESS_TYPE: Record<string, string> = {
  Food: 'Food & Beverage',
  Retail: 'Retail',
  Services: 'Services',
  Tourism: 'Tourism & Leisure',
};

type BusinessRow = {
  id: string;
  shop_name: string;
  logo_url: string | null;
  interior_images: string[] | null;
  business_categories: {
    name: string;
    business_types: { name: string } | null;
  } | null;
  business_subscriptions: Array<{
    status: string;
    current_period_end: string;
    subscription_plans: { features_promo_boost: boolean } | null;
  }>;
};

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount: { type: string; value: number };
  expiry_date: string;
  promotion_type: 'deal' | 'coupon';
  max_redemptions_global: number | null;
  current_redemptions: number;
  businesses: BusinessRow | null;
};

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
    // Strip the chars PostgREST uses as `.or()` delimiters so a stray comma /
    // paren in the query can't break the filter string below.
    const search = (searchParams.get('q') ?? '').replace(/[,()]/g, ' ').trim();

    const supabase = createBearerClient();
    const now = new Date().toISOString();

    // When searching, also match by business name: resolve the matching shop ids
    // (trigram-indexed on shop_name) and OR them into the coupons query by
    // business_id — a base-table column, so PostgREST can OR it with the
    // description / code predicates in one filter.
    let businessIdMatches: string[] = [];
    if (search) {
      const { data: bizMatches } = await supabase
        .from('businesses')
        .select('id')
        .ilike('shop_name', `%${search}%`)
        .limit(200);
      businessIdMatches = (bizMatches ?? []).map((b) => b.id as string);
    }

    let query = supabase
      .from('coupons')
      .select(
        `id, code, description, discount, expiry_date, promotion_type,
         max_redemptions_global, current_redemptions,
         businesses!business_id(
           id, shop_name, logo_url, interior_images,
           business_categories!category_id(
             name,
             business_types!business_type_id(name)
           ),
           business_subscriptions(
             status, current_period_end,
             subscription_plans!plan_id(features_promo_boost)
           )
         )`,
      )
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .gte('expiry_date', now);

    // Search the whole catalog (not just the top-N scan) so a match deep in the
    // catalog is still found; the limit applies after the filter.
    if (search) {
      const orParts = [
        `description.ilike.%${search}%`,
        `code.ilike.%${search}%`,
      ];
      if (businessIdMatches.length > 0) {
        orParts.push(`business_id.in.(${businessIdMatches.join(',')})`);
      }
      query = query.or(orParts.join(','));
    }

    const { data, error } = await query
      .order('current_redemptions', { ascending: false }) // most popular first
      .order('expiry_date', { ascending: true })
      .limit(MAX_DEALS_SCAN);

    if (error) {
      return loggedServerError('mobile/deals', error);
    }

    // Map DB row → mobile shape
    function toMobileDeal(row: CouponRow) {
      const biz = row.businesses;
      const slots =
        row.max_redemptions_global != null
          ? Math.max(0, row.max_redemptions_global - row.current_redemptions)
          : null;

      const now = new Date();
      const is_subscribed = (biz?.business_subscriptions ?? []).some(
        (sub) =>
          sub.status === 'active' &&
          new Date(sub.current_period_end) > now &&
          sub.subscription_plans?.features_promo_boost === true,
      );

      return {
        id: row.id,
        code: row.code,
        description: row.description,
        discount: row.discount,
        expiry_date: row.expiry_date,
        promotion_type: row.promotion_type,
        slots_remaining: slots,
        is_subscribed,
        business_id: biz?.id ?? '',
        business_name: biz?.shop_name ?? '',
        business_logo_url: biz
          ? resolveStorageUrl(supabase, 'shop-logos', biz.logo_url)
          : null,
        business_image_url: biz?.interior_images?.[0]
          ? resolveStorageUrl(
              supabase,
              'interior-images',
              biz.interior_images[0],
            )
          : null,
        business_category:
          biz?.business_categories?.business_types?.name ?? null,
      };
    }

    let deals = ((data ?? []) as unknown as CouponRow[]).map(toMobileDeal);

    // Apply category filter in app (PostgREST nested-relation predicates are
    // complex; filtering here keeps the query readable).
    if (category !== 'All') {
      const filterType = CATEGORY_TO_BUSINESS_TYPE[category] ?? null;
      // Unknown category key → empty result, not all results
      deals = filterType
        ? deals.filter((d) => d.business_category === filterType)
        : [];
    }

    // Classify: flash = expiring within 7 days; explore = everything else
    const flashCutoff = new Date(Date.now() + FLASH_WINDOW_MS).toISOString();
    const allFlash = deals.filter((d) => d.expiry_date <= flashCutoff);
    const nonFlash = deals.filter((d) => d.expiry_date > flashCutoff);

    // Featured = first non-flash deal (most popular by redemptions); fall back
    // to first flash deal if there are no non-flash deals at all
    const featuredSource = nonFlash.length > 0 ? nonFlash : allFlash;
    const featured = featuredSource[0] ?? null;

    // Exclude featured from flash to prevent double-exposure in the response
    const flash = featured
      ? allFlash.filter((d) => d.id !== featured.id)
      : allFlash;

    // Explore = non-flash deals excluding the featured one.
    // Subscribed businesses sorted first so they earn hero/duo bento slots.
    const exploreAll = (
      featured ? nonFlash.filter((d) => d.id !== featured.id) : nonFlash
    ).sort((a, b) => Number(b.is_subscribed) - Number(a.is_subscribed));

    const explore_total = exploreAll.length;
    const offset = (page - 1) * per_page;
    const explore = exploreAll.slice(offset, offset + per_page);

    return successResponse({
      featured,
      flash,
      explore,
      explore_total,
      explore_page: page,
      explore_per_page: per_page,
      explore_has_more: offset + per_page < explore_total,
    });
  } catch {
    return generalErrorResponse();
  }
}
