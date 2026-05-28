/**
 * Coupon Query Layer
 * Handles all direct Supabase database operations for coupons and featured deals
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Coupon,
  CouponFilters,
  FeaturedDeal,
  FeaturedDealFilters,
  RedemptionStats,
} from '@/lib/types';

// ===== Coupon Queries =====

/**
 * Get paginated coupons for a business
 */
export async function getCouponsPaginated(
  businessId: string,
  filters: CouponFilters,
) {
  try {
    const {
      page = 1,
      per_page = 20,
      search,
      status,
      sort_by = 'newest',
      branch_id,
    } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null);

    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    // Apply sorting
    if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort_by === 'expiry_asc') {
      query = query.order('expiry_date', { ascending: true });
    } else if (sort_by === 'expiry_desc') {
      query = query.order('expiry_date', { ascending: false });
    } else {
      // newest (default)
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      return {
        coupons: [] as Coupon[],
        total: 0,
        error: `Failed to fetch coupons: ${error.message}` as const,
      };
    }

    return {
      coupons: (data || []) as Coupon[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getCouponsPaginated]', err);
    return {
      coupons: [] as Coupon[],
      total: 0,
      error: 'Failed to fetch coupons' as const,
    };
  }
}

/**
 * Get coupon by ID
 */
export async function getCouponById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Coupon not found' as const };
    }

    return { coupon: data as Coupon };
  } catch (err) {
    console.error('[getCouponById]', err);
    return { error: 'Failed to fetch coupon' as const };
  }
}

/**
 * Get coupon by code (validate during redemption)
 */
export async function getCouponByCode(code: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'published')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Invalid coupon code' as const };
    }

    return { coupon: data as Coupon };
  } catch (err) {
    console.error('[getCouponByCode]', err);
    return { error: 'Failed to validate coupon' as const };
  }
}

/**
 * Check if coupon exists
 */
export async function couponExists(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count } = await supabase
      .from('coupons')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('archived_at', null);

    return (count || 0) > 0;
  } catch (err) {
    console.error('[couponExists]', err);
    return false;
  }
}

/**
 * Get redemption stats for a coupon
 */
export async function getRedemptionStats(
  couponId: string,
): Promise<RedemptionStats | null> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get coupon details
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (!coupon) return null;

    // Get redemption count
    const { count: totalRedemptions } = await supabase
      .from('user_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId);

    // Get unique users
    const { data: redemptions } = await supabase
      .from('user_redemptions')
      .select('user_id')
      .eq('coupon_id', couponId);

    const uniqueUsers = new Set((redemptions || []).map((r) => r.user_id)).size;

    // Get last redeemed date
    const { data: lastRedemption } = await supabase
      .from('user_redemptions')
      .select('redeemed_at')
      .eq('coupon_id', couponId)
      .order('redeemed_at', { ascending: false })
      .limit(1)
      .single();

    return {
      coupon_id: couponId,
      total_redemptions: totalRedemptions || 0,
      unique_users: uniqueUsers,
      remaining_global: coupon.max_redemptions_global
        ? coupon.max_redemptions_global - (totalRedemptions || 0)
        : null,
      last_redeemed_at: lastRedemption?.redeemed_at || null,
    };
  } catch (err) {
    console.error('[getRedemptionStats]', err);
    return null;
  }
}

// ===== Featured Deal Queries =====

/**
 * Get paginated featured deals (public listing)
 */
export async function getFeaturedDealsPaginated(filters: FeaturedDealFilters) {
  try {
    const { page = 1, per_page = 20, placement, sort_by = 'newest' } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    const now = new Date().toISOString();

    let query = supabase
      .from('featured_deals')
      .select('*', { count: 'exact' })
      .lte('start_date', now)
      .gte('end_date', now)
      .is('archived_at', null);

    if (placement) {
      query = query.eq('placement', placement);
    }

    // Apply sorting
    if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort_by === 'expiry_asc') {
      query = query.order('end_date', { ascending: true });
    } else if (sort_by === 'expiry_desc') {
      query = query.order('end_date', { ascending: false });
    } else {
      // newest (default)
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      return {
        deals: [] as FeaturedDeal[],
        total: 0,
        error: `Failed to fetch featured deals: ${error.message}` as const,
      };
    }

    return {
      deals: (data || []) as FeaturedDeal[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getFeaturedDealsPaginated]', err);
    return {
      deals: [] as FeaturedDeal[],
      total: 0,
      error: 'Failed to fetch featured deals' as const,
    };
  }
}

/**
 * Get featured deals by business
 */
export async function getFeaturedDealsByBusinessId(
  businessId: string,
  filters: FeaturedDealFilters = {},
) {
  try {
    const { page = 1, per_page = 20, placement, sort_by = 'newest' } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('featured_deals')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null);

    if (placement) {
      query = query.eq('placement', placement);
    }

    // Apply sorting
    if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort_by === 'expiry_asc') {
      query = query.order('end_date', { ascending: true });
    } else if (sort_by === 'expiry_desc') {
      query = query.order('end_date', { ascending: false });
    } else {
      // newest (default)
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      return {
        deals: [] as FeaturedDeal[],
        total: 0,
        error: `Failed to fetch featured deals: ${error.message}` as const,
      };
    }

    return {
      deals: (data || []) as FeaturedDeal[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getFeaturedDealsByBusinessId]', err);
    return {
      deals: [] as FeaturedDeal[],
      total: 0,
      error: 'Failed to fetch featured deals' as const,
    };
  }
}

/**
 * Get featured deal by ID
 */
export async function getFeaturedDealById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('featured_deals')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Featured deal not found' as const };
    }

    return { deal: data as FeaturedDeal };
  } catch (err) {
    console.error('[getFeaturedDealById]', err);
    return { error: 'Failed to fetch featured deal' as const };
  }
}

/**
 * Get coupon status counts for a business (used by stats panel)
 */
export async function getCouponStatsByBusiness(businessId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('coupons')
      .select('status, archived_at')
      .eq('business_id', businessId);

    if (error) return { total: 0, published: 0, draft: 0 };

    const nonArchived = (data || []).filter((c) => c.archived_at === null);

    return {
      total: nonArchived.length,
      published: nonArchived.filter((c) => c.status === 'published').length,
      draft: nonArchived.filter((c) => c.status === 'draft').length,
    };
  } catch {
    return { total: 0, published: 0, draft: 0 };
  }
}

/**
 * Check if featured deal exists
 */
export async function featuredDealExists(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count } = await supabase
      .from('featured_deals')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('archived_at', null);

    return (count || 0) > 0;
  } catch (err) {
    console.error('[featuredDealExists]', err);
    return false;
  }
}
