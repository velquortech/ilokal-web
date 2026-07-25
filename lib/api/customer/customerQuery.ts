/**
 * Customer-portal queries (public /explore + protected /customer).
 *
 * Every function runs on the cookie server client: anonymous visitors read
 * through the public RLS policies (verified businesses / published coupons /
 * active products only), and signed-in customers get their own rows via the
 * self-scoped policies (`follows`, `user_redemptions`). No service-role use.
 *
 * Pagination: offset (`.range()`) for the directory and product menus —
 * shareable page URLs with exact counts, matching the repo's table pattern.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type {
  CustomerCategory,
  DirectoryBusiness,
  DirectoryMetadata,
  FollowedBusiness,
  PublicBranch,
  PublicBusinessProfile,
  PublicCoupon,
  WalletFilter,
  WalletRedemption,
} from '@/lib/types/customer';

const DIRECTORY_DEFAULT_PER_PAGE = 12;
const DIRECTORY_MAX_PER_PAGE = 24;

export interface DirectoryFilters {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
}

interface DirectoryRow {
  id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  business_categories: { name: string } | null;
  branches: { id: string; name: string; address: string | null }[] | null;
}

async function getFollowerCountMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  businessIds: string[],
): Promise<Map<string, number>> {
  if (businessIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc('get_follower_counts', {
    p_business_ids: businessIds,
  });
  if (error) {
    console.error('[getFollowerCountMap]', error);
    return new Map();
  }
  const rows = (data ?? []) as {
    business_id: string;
    follower_count: number;
  }[];
  return new Map(rows.map((row) => [row.business_id, row.follower_count]));
}

export async function getBusinessDirectory(
  filters: DirectoryFilters,
): Promise<
  | { businesses: DirectoryBusiness[]; metadata: DirectoryMetadata }
  | { error: string }
> {
  try {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(
      DIRECTORY_MAX_PER_PAGE,
      Math.max(1, filters.per_page ?? DIRECTORY_DEFAULT_PER_PAGE),
    );
    const offset = (page - 1) * perPage;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('businesses')
      .select(
        `id, shop_name, description, logo_url, banner_url,
         business_categories!category_id (name),
         branches (id, name, address)`,
        { count: 'exact' },
      )
      .eq('status', 'verified')
      .is('archived_at', null)
      .is('branches.archived_at', null);

    if (filters.search) {
      query = query.ilike('shop_name', `%${filters.search}%`);
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    const { data, count, error } = await query
      .order('weekly_view_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1, { referencedTable: 'branches' })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error('[getBusinessDirectory]', error);
      return { error: 'Failed to load businesses' };
    }

    const rows = (data ?? []) as unknown as DirectoryRow[];
    const followerCounts = await getFollowerCountMap(
      supabase,
      rows.map((r) => r.id),
    );

    const businesses: DirectoryBusiness[] = rows.map((row) => ({
      id: row.id,
      shop_name: row.shop_name,
      description: row.description,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', row.logo_url),
      banner_url: resolveStorageUrl(supabase, 'shop-banners', row.banner_url),
      category_name: row.business_categories?.name ?? null,
      branch: row.branches?.[0] ?? null,
      follower_count: followerCounts.get(row.id) ?? 0,
    }));

    return {
      businesses,
      metadata: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
    };
  } catch (err) {
    console.error('[getBusinessDirectory]', err);
    return { error: 'Failed to load businesses' };
  }
}

export async function getCustomerCategories(): Promise<CustomerCategory[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('business_categories')
      .select('id, name')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    if (error) {
      console.error('[getCustomerCategories]', error);
      return [];
    }
    return (data ?? []) as CustomerCategory[];
  } catch (err) {
    console.error('[getCustomerCategories]', err);
    return [];
  }
}

interface ProfileBranchRow {
  id: string;
  name: string;
  address: string | null;
  location: { coordinates?: [number, number] } | null;
}

export async function getPublicBusinessProfile(
  businessId: string,
): Promise<{ business: PublicBusinessProfile } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `id, shop_name, description, logo_url, banner_url, interior_images,
         business_categories!category_id (name),
         branches (id, name, address, location)`,
      )
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .is('branches.archived_at', null)
      .maybeSingle();

    if (error) {
      console.error('[getPublicBusinessProfile]', error);
      return { error: 'Failed to load business' };
    }
    if (!data) return { error: 'NOT_FOUND' };

    const row = data as unknown as {
      id: string;
      shop_name: string;
      description: string | null;
      logo_url: string | null;
      banner_url: string | null;
      interior_images: string[] | null;
      business_categories: { name: string } | null;
      branches: ProfileBranchRow[] | null;
    };

    const [followerCounts, ratingRes] = await Promise.all([
      getFollowerCountMap(supabase, [row.id]),
      supabase.rpc('get_business_rating_summary', {
        p_business_ids: [row.id],
      }),
    ]);

    if (ratingRes.error) {
      // Aggregate is decorative — log and render without it.
      console.error('[getPublicBusinessProfile rating]', ratingRes.error);
    }
    const rating = ratingRes.data?.[0];

    const branches: PublicBranch[] = (
      (row.branches ?? []) as unknown as ProfileBranchRow[]
    ).map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      coordinates: b.location?.coordinates ?? null,
    }));

    const business: PublicBusinessProfile = {
      id: row.id,
      shop_name: row.shop_name,
      description: row.description,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', row.logo_url),
      banner_url: resolveStorageUrl(supabase, 'shop-banners', row.banner_url),
      interior_images: (row.interior_images ?? [])
        .map((url) => resolveStorageUrl(supabase, 'interior-images', url))
        .filter((u): u is string => Boolean(u)),
      category_name: row.business_categories?.name ?? null,
      branches,
      follower_count: followerCounts.get(row.id) ?? 0,
      rating_average:
        rating?.rating_average != null ? Number(rating.rating_average) : null,
      rating_count: Number(rating?.rating_count ?? 0),
    };

    return { business };
  } catch (err) {
    console.error('[getPublicBusinessProfile]', err);
    return { error: 'Failed to load business' };
  }
}

export async function getPublicCoupons(
  businessId: string,
): Promise<{ coupons: PublicCoupon[] } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Coupon access invariant: published + not archived + already started.
    const { data, error } = await supabase
      .from('coupons')
      .select(
        `id, code, description, discount, promotion_type, start_date,
         expiry_date, requires_follow, branch_id,
         max_redemptions_per_user, max_redemptions_global, current_redemptions`,
      )
      .eq('business_id', businessId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .gte('expiry_date', now)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('[getPublicCoupons]', error);
      return { error: 'Failed to load deals' };
    }
    return { coupons: (data ?? []) as unknown as PublicCoupon[] };
  } catch (err) {
    console.error('[getPublicCoupons]', err);
    return { error: 'Failed to load deals' };
  }
}

const WALLET_FILTERS: Record<
  WalletFilter,
  (
    q: ReturnType<typeof walletBase>,
    now: string,
  ) => ReturnType<typeof walletBase>
> = {
  active: (q, now) => q.eq('is_claimed', false).gt('expires_at', now),
  claimed: (q) => q.eq('is_claimed', true),
  expired: (q, now) => q.eq('is_claimed', false).lte('expires_at', now),
};

function walletBase(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  return supabase.from('user_redemptions').select(
    `id, code, redeemed_at, expires_at, is_claimed,
       coupons (id, code, description, discount, expiry_date,
         businesses (id, shop_name, logo_url)),
       branches (id, name, address)`,
  );
}

export async function getWalletRedemptions(
  userId: string,
  filter?: WalletFilter,
): Promise<{ redemptions: WalletRedemption[] } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    let query = walletBase(supabase).eq('user_id', userId);
    if (filter) query = WALLET_FILTERS[filter](query, now);

    const { data, error } = await query.order('redeemed_at', {
      ascending: false,
    });

    if (error) {
      console.error('[getWalletRedemptions]', error);
      return { error: 'Failed to load redemptions' };
    }

    const redemptions: WalletRedemption[] = (
      (data ?? []) as unknown as Array<{
        id: string;
        code: string | null;
        redeemed_at: string;
        expires_at: string | null;
        is_claimed: boolean;
        coupons: {
          id: string;
          code: string;
          description: string | null;
          discount: PublicCoupon['discount'];
          expiry_date: string;
          businesses: {
            id: string;
            shop_name: string;
            logo_url: string | null;
          } | null;
        } | null;
        branches: { id: string; name: string; address: string | null } | null;
      }>
    ).map((row) => ({
      id: row.id,
      code: row.code,
      redeemed_at: row.redeemed_at,
      expires_at: row.expires_at,
      is_claimed: row.is_claimed,
      coupon: row.coupons
        ? {
            ...row.coupons,
            business: row.coupons.businesses
              ? {
                  ...row.coupons.businesses,
                  logo_url: resolveStorageUrl(
                    supabase,
                    'shop-logos',
                    row.coupons.businesses.logo_url,
                  ),
                }
              : null,
          }
        : null,
      branch: row.branches,
    }));

    return { redemptions };
  } catch (err) {
    console.error('[getWalletRedemptions]', err);
    return { error: 'Failed to load redemptions' };
  }
}

export async function getFollowedBusinesses(
  userId: string,
): Promise<{ followed: FollowedBusiness[] } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('follows')
      .select(
        'id, created_at, businesses (id, shop_name, logo_url, description)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getFollowedBusinesses]', error);
      return { error: 'Failed to load followed shops' };
    }

    const followed: FollowedBusiness[] = (
      (data ?? []) as unknown as Array<{
        id: string;
        created_at: string;
        businesses: {
          id: string;
          shop_name: string;
          logo_url: string | null;
          description: string | null;
        } | null;
      }>
    )
      .filter((row) => row.businesses)
      .map((row) => ({
        follow_id: row.id,
        followed_at: row.created_at,
        business: {
          ...row.businesses!,
          logo_url: resolveStorageUrl(
            supabase,
            'shop-logos',
            row.businesses!.logo_url,
          ),
        },
      }));

    return { followed };
  } catch (err) {
    console.error('[getFollowedBusinesses]', err);
    return { error: 'Failed to load followed shops' };
  }
}

/** Whether the signed-in user already follows the business. */
export async function isFollowingBusiness(
  userId: string,
  businessId: string,
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { count, error } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('business_id', businessId);
    if (error) {
      console.error('[isFollowingBusiness]', error);
      return false;
    }
    return (count ?? 0) > 0;
  } catch (err) {
    console.error('[isFollowingBusiness]', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Updates feed — web twin of GET /api/protected/mobile/updates (same bounded
// FEED_SCAN merge of posts + live promos + new products from followed shops;
// offset-paged over the merged set). Keep the two in lockstep until the shared
// core extraction (tracked follow-up).
// ---------------------------------------------------------------------------

const FEED_SCAN = 50;

export interface UpdateItem {
  id: string;
  type: 'post' | 'promo' | 'product';
  title: string;
  body: string | null;
  image_url: string | null;
  published_at: string;
  business: { id: string; shop_name: string; logo_url: string | null } | null;
  coupon_id?: string;
}

type FeedBizJoin = {
  id: string;
  shop_name: string;
  logo_url: string | null;
} | null;

export async function getUpdatesFeed(
  userId: string,
  page = 1,
  perPage = 10,
): Promise<
  { updates: UpdateItem[]; metadata: DirectoryMetadata } | { error: string }
> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('business_id')
      .eq('user_id', userId);

    if (followsError) {
      console.error('[getUpdatesFeed]', followsError);
      return { error: 'Failed to load updates' };
    }

    const businessIds = (follows ?? []).map((f) => f.business_id as string);
    const empty = {
      updates: [] as UpdateItem[],
      metadata: { total: 0, page: 1, per_page: perPage, total_pages: 0 },
    };
    if (businessIds.length === 0) return empty;

    const now = new Date().toISOString();
    const biz = 'businesses!business_id(id, shop_name, logo_url)';

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
    if (sourceError) {
      console.error('[getUpdatesFeed]', sourceError);
      return { error: 'Failed to load updates' };
    }

    const toBiz = (raw: FeedBizJoin): FeedBizJoin =>
      raw
        ? {
            ...raw,
            logo_url: resolveStorageUrl(supabase, 'shop-logos', raw.logo_url),
          }
        : null;

    const posts: UpdateItem[] = (
      (postsRes.data ?? []) as unknown as Array<{
        id: string;
        title: string;
        body: string | null;
        image_url: string | null;
        published_at: string;
        businesses: FeedBizJoin;
      }>
    ).map((p) => ({
      id: `post:${p.id}`,
      type: 'post',
      title: p.title,
      body: p.body,
      image_url: resolveStorageUrl(supabase, 'business-posts', p.image_url),
      published_at: p.published_at,
      business: toBiz(p.businesses),
    }));

    const promos: UpdateItem[] = (
      (couponsRes.data ?? []) as unknown as Array<{
        id: string;
        code: string;
        description: string | null;
        start_date: string;
        businesses: FeedBizJoin;
      }>
    ).map((c) => ({
      id: `promo:${c.id}`,
      type: 'promo',
      title: c.code,
      body: c.description,
      image_url: null,
      published_at: c.start_date,
      business: toBiz(c.businesses),
      coupon_id: c.id,
    }));

    const products: UpdateItem[] = (
      (productsRes.data ?? []) as unknown as Array<{
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        created_at: string;
        businesses: FeedBizJoin;
      }>
    ).map((pr) => ({
      id: `product:${pr.id}`,
      type: 'product',
      title: pr.name,
      body: pr.description,
      image_url: resolveStorageUrl(supabase, 'product-images', pr.image_url),
      published_at: pr.created_at,
      business: toBiz(pr.businesses),
    }));

    const merged = [...posts, ...promos, ...products].sort(
      (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
    );

    const offset = (page - 1) * perPage;
    return {
      updates: merged.slice(offset, offset + perPage),
      metadata: {
        total: merged.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(merged.length / perPage),
      },
    };
  } catch (err) {
    console.error('[getUpdatesFeed]', err);
    return { error: 'Failed to load updates' };
  }
}
