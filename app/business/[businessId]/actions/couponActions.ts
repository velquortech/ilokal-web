'use server';

import { createServerSupabaseClient } from '@/supabase/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type {
  ApiResponse,
  ApiError,
  Coupon,
  CouponFilters,
  PaginatedCouponsResponse,
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
import couponService from '@/lib/services/couponService';
import {
  getCouponsPaginated,
  getCouponStatsByBusiness,
} from '@/lib/api/coupons/couponQuery';

// ===== Coupon Read Actions =====

export async function getBusinessCouponsPaginatedAction(
  filters: Omit<CouponFilters, 'business_id'>,
): Promise<ApiResponse<PaginatedCouponsResponse>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const result = await getCouponsPaginated(verify.business!.id, filters);

    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: result.error ?? 'Failed to fetch coupons',
        },
      };
    }

    return { success: true, data: result as PaginatedCouponsResponse };
  } catch (error) {
    console.error('[getBusinessCouponsPaginatedAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch coupons' },
    };
  }
}

export async function getBusinessCouponStatsAction(): Promise<
  ApiResponse<{
    total: number;
    active: number;
    expired: number;
    upcoming: number;
  }>
> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const stats = await getCouponStatsByBusiness(verify.business!.id);
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getBusinessCouponStatsAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch coupon stats',
      },
    };
  }
}

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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return (await couponService.create(
      verify.business!.id,
      validation.data,
    )) as ApiResponse<Coupon>;
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { coupon, error }: { coupon?: Coupon; error?: string } = await (
      await import('@/lib/api/coupons/couponQuery')
    ).getCouponById(id);
    if (error || !coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    if (coupon.business_id !== verify.business!.id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this coupon',
        },
      };
    }

    return (await couponService.update(
      id,
      validation.data,
    )) as ApiResponse<Coupon>;
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
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { coupon, error }: { coupon?: Coupon; error?: string } = await (
      await import('@/lib/api/coupons/couponQuery')
    ).getCouponById(id);
    if (error || !coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    if (coupon.business_id !== verify.business!.id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this coupon',
        },
      };
    }

    return (await couponService.delete(id)) as ApiResponse<null>;
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

    return (await couponService.redeem(
      couponCode,
      user.id,
    )) as ApiResponse<CouponDetailResponse>;
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return (await couponService.createFeaturedDeal(
      verify.business!.id,
      validation.data,
    )) as ApiResponse<FeaturedDeal>;
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { coupon: deal, error }: { coupon?: Coupon; error?: string } = await (
      await import('@/lib/api/coupons/couponQuery')
    ).getCouponById(id);
    if (error || !deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    if (deal.business_id !== verify.business!.id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this featured deal',
        },
      };
    }

    return (await couponService.updateFeaturedDeal(
      id,
      validation.data,
    )) as ApiResponse<FeaturedDeal>;
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
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { coupon: deal, error }: { coupon?: Coupon; error?: string } = await (
      await import('@/lib/api/coupons/couponQuery')
    ).getCouponById(id);
    if (error || !deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    if (deal.business_id !== verify.business!.id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this featured deal',
        },
      };
    }

    return (await couponService.deleteFeaturedDeal(id)) as ApiResponse<null>;
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
