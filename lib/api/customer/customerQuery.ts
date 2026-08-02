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

import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { getProductsPaginated } from '@/lib/api/products/productQuery';
import { describeDbError } from '@/lib/utils/describeDbError';
import type {
  CustomerCategory,
  DirectoryBusiness,
  DirectoryMetadata,
  FollowedBusiness,
  PublicBranch,
  PublicBusinessInfo,
  PublicBusinessProfile,
  PublicCoupon,
  PublicProduct,
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

/**
 * Moved to `lib/utils/describeDbError.ts` once a second module needed it (the
 * events query layer). Imported for use below and re-exported so existing
 * importers and their tests keep working — there is one implementation, not
 * two.
 */
export { describeDbError };

async function getFollowerCountMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  businessIds: string[],
): Promise<Map<string, number>> {
  if (businessIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc('get_follower_counts', {
    p_business_ids: businessIds,
  });
  if (error) {
    console.error('[getFollowerCountMap]', describeDbError(error));
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
      .is('branches.archived_at', null)
      // Soft-deleted categories must not label public cards (embedded-relation
      // soft-delete convention).
      .is('business_categories.deleted_at', null);

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

/**
 * Wrapped in React.cache so generateMetadata + the page body share ONE fetch
 * (this is the hottest public page; uncached it double-fires the profile read
 * plus both RPC fan-outs on every request).
 *
 * Errors are typed: `NOT_FOUND` (render 404) vs `LOAD_FAILED` (transient —
 * render an error state, NEVER notFound(), or healthy shops get deindexed
 * during a DB blip).
 */
export const getPublicBusinessProfile = cache(
  async (
    businessId: string,
  ): Promise<
    { business: PublicBusinessProfile } | { error: 'NOT_FOUND' | 'LOAD_FAILED' }
  > => {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('businesses')
        .select(
          `id, shop_name, description, logo_url, banner_url, interior_images,
         business_categories!category_id (name)`,
        )
        .eq('id', businessId)
        .eq('status', 'verified')
        .is('archived_at', null)
        .is('business_categories.deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[getPublicBusinessProfile]', error);
        return { error: 'LOAD_FAILED' };
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
      };

      // Branch coordinates come from the business_branches RPC: PostGIS
      // geography through a nested PostgREST select is WKB hex, not GeoJSON —
      // the RPC exists precisely to expose lat/lng (see 20260602000000).
      const [followerCounts, ratingRes, branchesRes, infoRes] =
        await Promise.all([
          getFollowerCountMap(supabase, [row.id]),
          supabase.rpc('get_business_rating_summary', {
            p_business_ids: [row.id],
          }),
          supabase.rpc('business_branches', { p_business_id: row.id }),
          // business_settings is owner-only RLS; this RPC exposes just the
          // four public fields (see 20260727000006).
          supabase.rpc('get_business_public_info', { p_business_id: row.id }),
        ]);

      if (ratingRes.error) {
        // Aggregate is decorative — log and render without it.
        console.error(
          '[getPublicBusinessProfile rating]',
          describeDbError(ratingRes.error),
        );
      }
      const rating = ratingRes.data?.[0];

      if (branchesRes.error) {
        console.error(
          '[getPublicBusinessProfile branches]',
          describeDbError(branchesRes.error),
        );
      }
      const branches: PublicBranch[] = (
        (branchesRes.data ?? []) as Array<{
          id: string;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
        }>
      ).map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        // PublicBranch keeps the GeoJSON [lng, lat] order the map expects.
        coordinates:
          b.latitude != null && b.longitude != null
            ? [b.longitude, b.latitude]
            : null,
      }));

      if (infoRes.error) {
        // Decorative like the rating aggregate: a failed read renders as "the
        // shop published nothing", never a broken page.
        console.error(
          '[getPublicBusinessProfile info]',
          describeDbError(infoRes.error),
        );
      }
      const infoRow = (
        infoRes.data as PublicBusinessInfo[] | null | undefined
      )?.[0];
      const info: PublicBusinessInfo | null = infoRow
        ? {
            operating_hours: infoRow.operating_hours ?? null,
            social_links: infoRow.social_links ?? null,
            contact_website: infoRow.contact_website ?? null,
            contact_phone_public: infoRow.contact_phone_public ?? null,
          }
        : null;

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
        info,
      };

      return { business };
    } catch (err) {
      console.error('[getPublicBusinessProfile]', err);
      return { error: 'LOAD_FAILED' };
    }
  },
);

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

// Filters mirror the mobile wallet contract exactly: a NULL expires_at counts
// as ACTIVE (never expires), and `expired` requires a real, past expires_at.
const WALLET_FILTERS: Record<
  WalletFilter,
  (
    q: ReturnType<typeof walletBase>,
    now: string,
  ) => ReturnType<typeof walletBase>
> = {
  active: (q, now) =>
    q.eq('is_claimed', false).or(`expires_at.is.null,expires_at.gt.${now}`),
  claimed: (q) => q.eq('is_claimed', true),
  expired: (q, now) =>
    q
      .eq('is_claimed', false)
      .not('expires_at', 'is', null)
      .lt('expires_at', now),
};

function walletBase(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  return supabase.from('user_redemptions').select(
    `id, code, redeemed_at, expires_at, is_claimed,
       coupons (id, code, description, discount, expiry_date,
         businesses (id, shop_name, logo_url)),
       branches (id, name, address)`,
    { count: 'exact' },
  );
}

const WALLET_PER_PAGE = 12;

export async function getWalletRedemptions(
  userId: string,
  filter?: WalletFilter,
  page = 1,
): Promise<
  | { redemptions: WalletRedemption[]; metadata: DirectoryMetadata }
  | { error: string }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * WALLET_PER_PAGE;

    let query = walletBase(supabase).eq('user_id', userId);
    if (filter) query = WALLET_FILTERS[filter](query, now);

    const { data, count, error } = await query
      .order('redeemed_at', { ascending: false })
      .range(offset, offset + WALLET_PER_PAGE - 1);

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

    return {
      redemptions,
      metadata: {
        total: count ?? 0,
        page: safePage,
        per_page: WALLET_PER_PAGE,
        total_pages: Math.ceil((count ?? 0) / WALLET_PER_PAGE),
      },
    };
  } catch (err) {
    console.error('[getWalletRedemptions]', err);
    return { error: 'Failed to load redemptions' };
  }
}

// Bounded read: past this many follows the sidebar list truncates (the count
// stays exact via the piggybacked count) — well past that, PostgREST would
// otherwise silently cap at max_rows and quietly lie.
const FOLLOWED_LIST_LIMIT = 200;

export async function getFollowedBusinesses(
  userId: string,
): Promise<
  { followed: FollowedBusiness[]; total: number } | { error: string }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, count, error } = await supabase
      .from('follows')
      .select(
        'id, created_at, businesses (id, shop_name, logo_url, description)',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, FOLLOWED_LIST_LIMIT - 1);

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

    return { followed, total: count ?? followed.length };
  } catch (err) {
    console.error('[getFollowedBusinesses]', err);
    return { error: 'Failed to load followed shops' };
  }
}

/**
 * Resolve a profile avatar storage path to a public URL (real registrations
 * store raw in-bucket paths; only seeds store full URLs).
 */
export async function resolvePublicAvatarUrl(
  pathOrUrl: string | null | undefined,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const supabase = await createServerSupabaseClient();
  return resolveStorageUrl(supabase, 'avatars', pathOrUrl);
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

export interface UpdatesFeedPage {
  updates: UpdateItem[];
  page: number;
  per_page: number;
  /**
   * The merged set is bounded at 3×FEED_SCAN, so an exact total would be a
   * fabricated number for active followers — expose has_more only, exactly
   * like the mobile route.
   */
  has_more: boolean;
}

export async function getUpdatesFeed(
  userId: string,
  page = 1,
  perPage = 10,
): Promise<UpdatesFeedPage | { error: string }> {
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
    const empty: UpdatesFeedPage = {
      updates: [],
      page: 1,
      per_page: perPage,
      has_more: false,
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
      page,
      per_page: perPage,
      has_more: offset + perPage < merged.length,
    };
  } catch (err) {
    console.error('[getUpdatesFeed]', err);
    return { error: 'Failed to load updates' };
  }
}

// ---------------------------------------------------------------------------
// Public menu — getProductsPaginated + storage-URL resolution (the raw query
// returns in-bucket paths; next/image throws on relative srcs).
// ---------------------------------------------------------------------------

export async function getPublicMenu(
  businessId: string,
  page = 1,
  perPage = 8,
): Promise<
  { products: PublicProduct[]; metadata: DirectoryMetadata } | { error: string }
> {
  const result = await getProductsPaginated({
    business_id: businessId,
    status: 'active',
    page,
    per_page: perPage,
  });
  if ('error' in result) return { error: 'Failed to load the menu' };

  const supabase = await createServerSupabaseClient();
  const products: PublicProduct[] = result.products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: p.price,
    sale_price: p.sale_price ?? null,
    // Carried through so a per-hour service / per-day rental renders its unit
    // instead of a bare peso figure (see .claude/OFFERINGS_MODEL.md G1).
    price_type: p.price_type ?? 'fixed',
    price_unit: p.price_unit ?? null,
    booking_mode: p.booking_mode ?? 'none',
    duration_minutes: p.duration_minutes ?? null,
    branch_id: p.branch_id ?? null,
    image_url: resolveStorageUrl(supabase, 'product-images', p.image_url),
    category_name: p.category?.name ?? null,
    // The shop's own heading for this offering — the public page groups by it.
    section_id: p.section_id ?? null,
    section_name: p.section?.name ?? null,
  }));

  return {
    products,
    metadata: {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      total_pages: result.total_pages,
    },
  };
}

// ---------------------------------------------------------------------------
// Deals feed — thin wrapper over the mobile_deals RPC + storage resolution,
// so pages never touch the Supabase client directly (repo rule).
// ---------------------------------------------------------------------------

export interface FeedDeal {
  id: string;
  code: string;
  description: string | null;
  discount: PublicCoupon['discount'];
  expiry_date: string;
  promotion_type: string;
  slots_remaining: number | null;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
}

export interface DealsFeed {
  featured: FeedDeal | null;
  flash: FeedDeal[];
  explore: FeedDeal[];
  explore_total: number;
  explore_page: number;
  explore_per_page: number;
}

export async function getDealsFeed(
  page = 1,
  perPage = 20,
): Promise<DealsFeed | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('mobile_deals', {
      p_category: 'All',
      p_search: '',
      p_page: Math.max(1, page),
      p_per_page: perPage,
    });

    if (error) {
      console.error('[getDealsFeed]', error);
      return { error: 'Failed to load deals' };
    }

    const payload = (data ?? {}) as unknown as Partial<DealsFeed>;
    const resolve = (deal: FeedDeal): FeedDeal => ({
      ...deal,
      business_logo_url: resolveStorageUrl(
        supabase,
        'shop-logos',
        deal.business_logo_url,
      ),
    });

    return {
      featured: payload.featured ? resolve(payload.featured) : null,
      flash: (payload.flash ?? []).map(resolve),
      explore: (payload.explore ?? []).map(resolve),
      explore_total: payload.explore_total ?? 0,
      explore_page: payload.explore_page ?? 1,
      explore_per_page: payload.explore_per_page ?? perPage,
    };
  } catch (err) {
    console.error('[getDealsFeed]', err);
    return { error: 'Failed to load deals' };
  }
}
