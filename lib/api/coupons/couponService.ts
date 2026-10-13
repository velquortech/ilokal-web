/**
 * Coupon Service Layer
 * Business logic for coupon management
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Coupon,
  CouponDetailResponse,
  ApiResponse,
  CreateCouponRequest,
  UpdateCouponRequest,
} from '@/lib/types';
import * as couponQuery from './couponQuery';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

// ===== Coupon Service =====

/**
 * Create a new coupon for a business
 */
export async function createCoupon(
  businessIdOrInput: string | CreateCouponRequest,
  maybeInput?: CreateCouponRequest,
): Promise<ApiResponse<Coupon>> {
  // Backwards-compatible: tests call createCoupon(input) without businessId.
  let businessId: string;
  let input: CreateCouponRequest;
  if (typeof businessIdOrInput === 'object' && businessIdOrInput !== null) {
    input = businessIdOrInput as CreateCouponRequest;
    const maybeBusinessId = (businessIdOrInput as Record<string, unknown>)[
      'business_id'
    ];
    businessId = typeof maybeBusinessId === 'string' ? maybeBusinessId : '';
  } else {
    businessId = businessIdOrInput as string;
    input = maybeInput as CreateCouponRequest;
  }
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        business_id: businessId,
        branch_id: input.branch_id ?? null,
        promotion_type: input.promotion_type ?? 'coupon',
        status: input.status ?? 'draft',
        code: input.code.toUpperCase(),
        description: input.description || null,
        discount: input.discount,
        usage_scope: input.usage_scope,
        scope_values: input.scope_values || null,
        start_date: input.start_date,
        expiry_date: input.expiry_date,
        max_redemptions_global: input.max_redemptions_global || null,
        max_redemptions_per_user: input.max_redemptions_per_user || null,
        requires_follow: input.requires_follow ?? false,
        image_url: input.image_url ?? null,
        current_redemptions: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[createCoupon] Insert error:', formatErrorForLog(error));
      if (error.code === '23505') {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message:
              'A coupon with this code already exists for your business. Use a different code.',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create coupon',
        },
      };
    }

    return {
      success: true,
      data: data as Coupon,
    };
  } catch (err) {
    console.error('[createCoupon]', formatErrorForLog(err));
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
export async function updateCoupon(
  id: string,
  input: UpdateCouponRequest,
  skipExistenceCheck = false,
): Promise<ApiResponse<Coupon>> {
  try {
    const supabase = await createServerSupabaseClient();

    const exists = skipExistenceCheck || (await couponQuery.couponExists(id));
    if (!exists) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.promotion_type) updateData.promotion_type = input.promotion_type;
    if (input.status) updateData.status = input.status;
    if (input.code) updateData.code = input.code.toUpperCase();
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.discount) updateData.discount = input.discount;
    if (input.usage_scope) updateData.usage_scope = input.usage_scope;
    if (input.scope_values !== undefined)
      updateData.scope_values = input.scope_values.length
        ? input.scope_values
        : null;
    if (input.start_date) updateData.start_date = input.start_date;
    if (input.expiry_date) updateData.expiry_date = input.expiry_date;
    if (input.max_redemptions_global !== undefined)
      updateData.max_redemptions_global = input.max_redemptions_global;
    if (input.max_redemptions_per_user !== undefined)
      updateData.max_redemptions_per_user = input.max_redemptions_per_user;
    if (input.requires_follow !== undefined)
      updateData.requires_follow = input.requires_follow;
    // `undefined` means "not sent", null means "remove the photo" — collapsing
    // the two would make clearing an image impossible.
    if (input.image_url !== undefined) updateData.image_url = input.image_url;

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateCoupon] Update error:', formatErrorForLog(error));
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update coupon',
        },
      };
    }

    return {
      success: true,
      data: data as Coupon,
    };
  } catch (err) {
    console.error('[updateCoupon]', formatErrorForLog(err));
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
 * Soft delete a coupon
 */
export async function deleteCoupon(
  id: string,
  skipExistenceCheck = false,
): Promise<ApiResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient();

    const exists = skipExistenceCheck || (await couponQuery.couponExists(id));
    if (!exists) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const { error } = await supabase
      .from('coupons')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[deleteCoupon] Update error:', formatErrorForLog(error));
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete coupon',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[deleteCoupon]', formatErrorForLog(err));
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
 * Redeem a coupon (track redemption)
 */
export async function redeemCoupon(
  couponCode: string,
  userId: string,
): Promise<ApiResponse<CouponDetailResponse>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get coupon by code
    const couponResult = await couponQuery.getCouponByCode(couponCode);
    if ('error' in couponResult) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: couponResult.error || 'Invalid coupon code',
        },
      };
    }

    const coupon = couponResult.coupon;

    // Check if coupon is active
    const now = new Date();
    if (new Date(coupon.start_date) > now) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Coupon is not yet active',
        },
      };
    }

    if (new Date(coupon.expiry_date) < now) {
      return {
        success: false,
        error: {
          code: 'COUPON_EXPIRED',
          message: 'Coupon has expired',
        },
      };
    }

    // Check global redemption limit
    if (coupon.max_redemptions_global) {
      const { count: totalRedemptions } = await supabase
        .from('user_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);

      if ((totalRedemptions || 0) >= coupon.max_redemptions_global) {
        return {
          success: false,
          error: {
            code: 'COUPON_LIMIT_REACHED',
            message: 'Coupon redemption limit reached',
          },
        };
      }
    }

    // Check per-user redemption limit
    if (coupon.max_redemptions_per_user) {
      const { count: userRedemptions } = await supabase
        .from('user_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);

      if ((userRedemptions || 0) >= coupon.max_redemptions_per_user) {
        return {
          success: false,
          error: {
            code: 'COUPON_ALREADY_REDEEMED',
            message: 'You have already redeemed this coupon maximum times',
          },
        };
      }
    }

    // Record redemption
    const { data: redemptionRow, error: redeemError } = await supabase
      .from('user_redemptions')
      .insert({
        coupon_id: coupon.id,
        user_id: userId,
        redeemed_at: new Date().toISOString(),
        expires_at: coupon.expiry_date,
        is_claimed: false,
      })
      .select('id')
      .single();

    if (redeemError) {
      console.error(
        '[redeemCoupon] Insert error:',
        formatErrorForLog(redeemError),
      );
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to redeem coupon',
        },
      };
    }

    // Atomic global-cap enforcement — closes the race between the count check above
    // and concurrent inserts. RPC returns false when the cap was already filled by a
    // concurrent request; roll back the over-cap row in that case.
    if (coupon.max_redemptions_global) {
      const { data: incremented, error: incrError } = await supabase.rpc(
        'increment_coupon_redemptions',
        { p_coupon_id: coupon.id },
      );
      if (incrError) {
        console.error(
          '[redeemCoupon] counter increment failed:',
          incrError.message,
        );
      } else if (!incremented) {
        await supabase
          .from('user_redemptions')
          .delete()
          .eq('id', redemptionRow.id);
        return {
          success: false,
          error: {
            code: 'COUPON_LIMIT_REACHED',
            message: 'Coupon redemption limit reached',
          },
        };
      }
    }

    // Get updated stats
    const stats = await couponQuery.getRedemptionStats(coupon.id);

    if (!stats) {
      // This should not happen since coupon exists, but handle it
      console.error('[redeemCoupon] Failed to fetch redemption stats');
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch redemption stats',
        },
      };
    }

    return {
      success: true,
      data: {
        coupon,
        stats,
      },
    };
  } catch (err) {
    console.error('[redeemCoupon]', formatErrorForLog(err));
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to redeem coupon',
      },
    };
  }
}
