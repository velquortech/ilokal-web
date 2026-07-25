'use server';

/**
 * Customer (role app_user) mutations — follow/unfollow + coupon redeem.
 *
 * Web twin of the mobile contract: the redeem gates mirror
 * `app/api/protected/mobile/redemptions/route.ts` 1:1 (same order, same user
 * copy — see `.claude/docs/coupon-rules.md`). Unifying both behind one shared
 * core is a tracked follow-up; the tests pin this action to the same matrix.
 *
 * All queries run on the cookie RLS client: `follows` and `user_redemptions`
 * writes land through the self-scoped policies, so a forged businessId/couponId
 * can never touch another user's rows.
 */

import { z } from 'zod';
import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';

export type CustomerActionError =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR';

interface ActionFailure {
  ok: false;
  code: CustomerActionError;
  message: string;
}

const guid = z.guid();

async function requireCustomer(): Promise<{ userId: string } | ActionFailure> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Sign in to continue',
    };
  }
  if (user.role !== 'app_user') {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Only customer accounts can do this',
    };
  }
  return { userId: user.id };
}

export async function followBusinessAction(
  businessId: string,
): Promise<{ ok: true } | ActionFailure> {
  try {
    const auth = await requireCustomer();
    if ('ok' in auth) return auth;
    if (!guid.safeParse(businessId).success) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Invalid business' };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('follows')
      .insert({ user_id: auth.userId, business_id: businessId });

    // 23505 = already following — treat as success (idempotent toggle).
    if (error && error.code !== '23505') {
      console.error('[followBusinessAction]', error);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not follow this shop right now',
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('[followBusinessAction]', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not follow this shop right now',
    };
  }
}

export async function unfollowBusinessAction(
  businessId: string,
): Promise<{ ok: true } | ActionFailure> {
  try {
    const auth = await requireCustomer();
    if ('ok' in auth) return auth;
    if (!guid.safeParse(businessId).success) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Invalid business' };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('user_id', auth.userId)
      .eq('business_id', businessId);

    if (error) {
      console.error('[unfollowBusinessAction]', error);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not unfollow this shop right now',
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('[unfollowBusinessAction]', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not unfollow this shop right now',
    };
  }
}

export interface RedeemSuccess {
  ok: true;
  redemption: {
    id: string;
    code: string | null;
    expires_at: string | null;
  };
}

export async function redeemCouponAction(
  couponId: string,
  branchId: string,
): Promise<RedeemSuccess | ActionFailure> {
  try {
    const auth = await requireCustomer();
    if ('ok' in auth) return auth;
    if (
      !guid.safeParse(couponId).success ||
      !guid.safeParse(branchId).success
    ) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'coupon_id and branch_id must be valid UUIDs',
      };
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Gate order mirrors the mobile route exactly.
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select(
        'id, start_date, expiry_date, status, max_redemptions_per_user, max_redemptions_global, current_redemptions, requires_follow, business_id',
      )
      .eq('id', couponId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .single();

    if (couponError || !coupon) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Coupon not found or not yet active',
      };
    }

    if (coupon.expiry_date < now) {
      return { ok: false, code: 'BAD_REQUEST', message: 'Coupon has expired' };
    }

    if (
      coupon.max_redemptions_global !== null &&
      (coupon.current_redemptions ?? 0) >= coupon.max_redemptions_global
    ) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Coupon has reached its redemption limit',
      };
    }

    if (coupon.requires_follow) {
      const { count: followCount, error: followError } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .eq('business_id', coupon.business_id);

      if (followError) {
        console.error('[redeemCouponAction]', followError);
        return {
          ok: false,
          code: 'SERVER_ERROR',
          message: 'Could not redeem right now',
        };
      }
      if ((followCount ?? 0) === 0) {
        return {
          ok: false,
          code: 'FORBIDDEN',
          message: 'Follow this business to claim this deal',
        };
      }
    }

    const { data: userRedemptions, error: redemptionsError } = await supabase
      .from('user_redemptions')
      .select('is_claimed, expires_at')
      .eq('coupon_id', couponId)
      .eq('user_id', auth.userId);

    if (redemptionsError) {
      console.error('[redeemCouponAction]', redemptionsError);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not redeem right now',
      };
    }

    const hasActiveRedemption = (userRedemptions ?? []).some(
      (r) => !r.is_claimed && (r.expires_at === null || r.expires_at > now),
    );
    if (hasActiveRedemption) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'You already have this deal in your wallet',
      };
    }

    if (
      coupon.max_redemptions_per_user !== null &&
      (userRedemptions ?? []).length >= coupon.max_redemptions_per_user
    ) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message:
          'You have already redeemed this coupon the maximum number of times',
      };
    }

    const { data: redemption, error: insertError } = await supabase
      .from('user_redemptions')
      .insert({
        user_id: auth.userId,
        coupon_id: couponId,
        branch_id: branchId,
        expires_at: coupon.expiry_date,
      })
      .select('id, code, expires_at')
      .single();

    if (insertError || !redemption) {
      console.error('[redeemCouponAction]', insertError);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not redeem right now',
      };
    }

    // Atomic global-cap increment; false ⇒ a concurrent redeem won the last
    // slot — roll back this row (mirrors the mobile route).
    const { data: incremented, error: incrError } = await supabase.rpc(
      'increment_coupon_redemptions',
      { p_coupon_id: couponId },
    );
    if (incrError) {
      console.error('[redeemCouponAction] increment failed:', incrError);
    } else if (!incremented) {
      await supabase.from('user_redemptions').delete().eq('id', redemption.id);
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Coupon has reached its redemption limit',
      };
    }

    // Owner notification — non-fatal by contract.
    const { error: notifyError } = await supabase.rpc(
      'notify_coupon_redemption',
      { p_redemption_id: redemption.id },
    );
    if (notifyError) {
      console.error('[redeemCouponAction] notify failed:', notifyError);
    }

    return { ok: true, redemption };
  } catch (err) {
    console.error('[redeemCouponAction]', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not redeem right now',
    };
  }
}
