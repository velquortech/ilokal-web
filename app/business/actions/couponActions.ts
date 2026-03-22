'use server';

import { createServerSupabaseClient } from '@/config/server';
import type {
  ApiResponse,
  Coupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CouponDetailResponse,
  FeaturedDeal,
  CreateFeaturedDealRequest,
  UpdateFeaturedDealRequest,
} from '@/lib/types';
import {
  createCouponSchema,
  updateCouponSchema,
  createFeaturedDealSchema,
  updateFeaturedDealSchema,
} from '@/lib/validation/coupons';
import * as couponService from '@/lib/api/coupons/couponService';

// ===== Coupon Management Actions =====

/**
 * Create a new coupon for the business
 */
export async function createCouponAction(
  input: CreateCouponRequest,
): Promise<ApiResponse<Coupon>> {
  try {
    // Validate input
    const validation = createCouponSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.code?.[0] || 'Invalid coupon data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await couponService.createCoupon(business.id, validation.data);
  } catch (error) {
    console.error('[createCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create coupon',
      },
    };
  }
}

/**
 * Update a coupon
 */
export async function updateCouponAction(
  id: string,
  input: UpdateCouponRequest,
): Promise<ApiResponse<Coupon>> {
  try {
    // Validate input
    const validation = updateCouponSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.code?.[0] || 'Invalid coupon data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the coupon's business
    const { data: coupon } = await supabase
      .from('coupons')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', coupon.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this coupon',
        },
      };
    }

    return await couponService.updateCoupon(id, validation.data);
  } catch (error) {
    console.error('[updateCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update coupon',
      },
    };
  }
}

/**
 * Delete a coupon
 */
export async function deleteCouponAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the coupon's business
    const { data: coupon } = await supabase
      .from('coupons')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', coupon.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this coupon',
        },
      };
    }

    return await couponService.deleteCoupon(id);
  } catch (error) {
    console.error('[deleteCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete coupon',
      },
    };
  }
}

/**
 * Redeem a coupon (public: any user)
 */
export async function redeemCouponAction(
  couponCode: string,
): Promise<ApiResponse<CouponDetailResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    return await couponService.redeemCoupon(couponCode, user.id);
  } catch (error) {
    console.error('[redeemCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to redeem coupon',
      },
    };
  }
}

/**
 * Create a featured deal for the business
 */
export async function createFeaturedDealAction(
  input: CreateFeaturedDealRequest,
): Promise<ApiResponse<FeaturedDeal>> {
  try {
    // Validate input
    const validation = createFeaturedDealSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.coupon_id?.[0] || 'Invalid featured deal data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await couponService.createFeaturedDeal(business.id, validation.data);
  } catch (error) {
    console.error('[createFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create featured deal',
      },
    };
  }
}

/**
 * Update a featured deal
 */
export async function updateFeaturedDealAction(
  id: string,
  input: UpdateFeaturedDealRequest,
): Promise<ApiResponse<FeaturedDeal>> {
  try {
    // Validate input
    const validation = updateFeaturedDealSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.coupon_id?.[0] || 'Invalid featured deal data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the deal's business
    const { data: deal } = await supabase
      .from('featured_deals')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', deal.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this featured deal',
        },
      };
    }

    return await couponService.updateFeaturedDeal(id, validation.data);
  } catch (error) {
    console.error('[updateFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update featured deal',
      },
    };
  }
}

/**
 * Delete a featured deal
 */
export async function deleteFeaturedDealAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the deal's business
    const { data: deal } = await supabase
      .from('featured_deals')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', deal.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this featured deal',
        },
      };
    }

    return await couponService.deleteFeaturedDeal(id);
  } catch (error) {
    console.error('[deleteFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete featured deal',
      },
    };
  }
}
