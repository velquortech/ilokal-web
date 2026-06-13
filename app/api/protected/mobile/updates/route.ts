import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// The Updates feed is a merge of three activity sources from the businesses the
// user follows: free-form posts, newly-live promos (coupons), and new products.
// Each source is scanned newest-first up to this cap, then merged + sliced
// in-app (mirrors the deals route — bounded scan instead of DB-side paging).
const FEED_SCAN = 50;

type BizJoin = {
  id: string;
  shop_name: string;
  logo_url: string | null;
} | null;

type PostRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  published_at: string;
  businesses: BizJoin;
};
type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  start_date: string;
  businesses: BizJoin;
};
type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  businesses: BizJoin;
};

type UpdateItem = {
  id: string;
  type: 'post' | 'promo' | 'product';
  title: string;
  body: string | null;
  image_url: string | null;
  published_at: string;
  business: BizJoin;
  coupon_id?: string;
};

function toBusiness(supabase: SupabaseClient, raw: BizJoin): BizJoin {
  if (!raw) return null;
  return {
    id: raw.id,
    shop_name: raw.shop_name,
    logo_url: resolveStorageUrl(supabase, 'shop-logos', raw.logo_url),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const supabase = auth.supabase;

    const { searchParams } = req.nextUrl;
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawPerPage = parseInt(searchParams.get('per_page') ?? '10', 10);
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const per_page = Math.min(
      50,
      Math.max(1, Number.isFinite(rawPerPage) ? rawPerPage : 10),
    );

    // Scope the feed to the businesses this user follows.
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('business_id')
      .eq('user_id', auth.user.id);

    if (followsError)
      return loggedServerError('protected/mobile/updates', followsError);

    const businessIds = (follows ?? []).map((f) => f.business_id as string);
    if (businessIds.length === 0) {
      return successResponse({ updates: [], page, per_page, has_more: false });
    }

    const now = new Date().toISOString();
    const biz = 'businesses!business_id(id, shop_name, logo_url)';

    // RLS already restricts each source to verified, non-archived businesses.
    const [postsRes, couponsRes, productsRes] = await Promise.all([
      supabase
        .from('business_posts')
        .select(`id, title, body, image_url, published_at, ${biz}`)
        .in('business_id', businessIds)
        .order('published_at', { ascending: false })
        .limit(FEED_SCAN),
      supabase
        .from('coupons')
        .select(`id, code, description, start_date, ${biz}`)
        .in('business_id', businessIds)
        .eq('status', 'published')
        .is('archived_at', null)
        .lte('start_date', now)
        .gte('expiry_date', now)
        .order('start_date', { ascending: false })
        .limit(FEED_SCAN),
      supabase
        .from('products')
        .select(`id, name, description, image_url, created_at, ${biz}`)
        .in('business_id', businessIds)
        .eq('is_available', true)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(FEED_SCAN),
    ]);

    const sourceError = postsRes.error || couponsRes.error || productsRes.error;
    if (sourceError)
      return loggedServerError('protected/mobile/updates', sourceError);

    const posts: UpdateItem[] = (
      (postsRes.data ?? []) as unknown as PostRow[]
    ).map((p) => ({
      id: `post:${p.id}`,
      type: 'post',
      title: p.title,
      body: p.body,
      image_url: resolveStorageUrl(supabase, 'business-posts', p.image_url),
      published_at: p.published_at,
      business: toBusiness(supabase, p.businesses),
    }));

    const promos: UpdateItem[] = (
      (couponsRes.data ?? []) as unknown as CouponRow[]
    ).map((c) => ({
      id: `promo:${c.id}`,
      type: 'promo',
      title: c.code,
      body: c.description,
      image_url: null,
      published_at: c.start_date,
      business: toBusiness(supabase, c.businesses),
      coupon_id: c.id,
    }));

    const products: UpdateItem[] = (
      (productsRes.data ?? []) as unknown as ProductRow[]
    ).map((pr) => ({
      id: `product:${pr.id}`,
      type: 'product',
      title: pr.name,
      body: pr.description,
      image_url: resolveStorageUrl(supabase, 'product-images', pr.image_url),
      published_at: pr.created_at,
      business: toBusiness(supabase, pr.businesses),
    }));

    const merged = [...posts, ...promos, ...products].sort(
      (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
    );

    const offset = (page - 1) * per_page;
    return successResponse({
      updates: merged.slice(offset, offset + per_page),
      page,
      per_page,
      has_more: offset + per_page < merged.length,
    });
  } catch {
    return generalErrorResponse();
  }
}
