'use server';

/**
 * Customer (role app_user) mutations — follow/unfollow + coupon redeem.
 *
 * Web twin of the mobile contract: redeem calls the same `redeem_coupon` RPC
 * as `app/api/protected/mobile/redemptions/route.ts`, so the gates (and their
 * user copy — see `.claude/docs/coupon-rules.md`) exist once, in SQL.
 *
 * All queries run on the cookie RLS client: `follows` writes land through the
 * self-scoped policy, and `user_redemptions` is written only by the RPC (direct
 * writes are revoked), so a forged businessId/couponId can never touch another
 * user's rows.
 */

import { z } from 'zod';
import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { logActionError } from '@/lib/utils/captureError';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { redemptionErrorCode } from '@/app/api/helpers/redemptionErrors';

export type CustomerActionError =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

interface ActionFailure {
  ok: false;
  code: CustomerActionError;
  message: string;
}

const guid = z.guid();

// Server-Action POSTs from /explore never enter the proxy matcher, so the
// mobile surface's flood guard doesn't cover these mutations — apply the same
// baseline per-user budget here (in-memory/per-instance, like the proxy's).
const ACTION_RATE_LIMIT = Number(process.env.CUSTOMER_ACTION_RATE_LIMIT ?? 30);
const ACTION_RATE_WINDOW_MS = Number(
  process.env.CUSTOMER_ACTION_RATE_WINDOW_MS ?? 60_000,
);

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
  // Explore-page actions bypass the proxy's /customer status gate, and a live
  // cookie session keeps refreshing — enforce account state here so a
  // suspended/archived customer can't keep mutating.
  if (user.status !== 'active' || user.archived_at != null) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'This account is not allowed to do this right now',
    };
  }
  const { allowed } = rateLimit(
    `customer-action:${user.id}`,
    ACTION_RATE_LIMIT,
    ACTION_RATE_WINDOW_MS,
  );
  if (!allowed) {
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests — please try again in a moment',
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
      logActionError('followBusinessAction', error);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not follow this shop right now',
      };
    }
    return { ok: true };
  } catch (err) {
    logActionError('followBusinessAction', err);
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
      logActionError('unfollowBusinessAction', error);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not unfollow this shop right now',
      };
    }
    return { ok: true };
  } catch (err) {
    logActionError('unfollowBusinessAction', err);
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

    // The gates, the insert and the counter bump all live in the RPC
    // (migration 20261024000000) — the same one the mobile route calls, so the
    // two surfaces can no longer drift.
    const { data: redemption, error: redeemError } = await supabase.rpc(
      'redeem_coupon',
      { p_coupon_id: couponId, p_branch_id: branchId },
    );

    if (redeemError || !redemption) {
      const code = redeemError ? redemptionErrorCode(redeemError) : null;
      if (code) {
        return {
          ok: false,
          code:
            code === 'FOLLOW_REQUIRED'
              ? 'FORBIDDEN'
              : code === 'UNAUTHENTICATED'
                ? 'AUTH_REQUIRED'
                : 'BAD_REQUEST',
          message: redeemError?.hint || code,
        };
      }
      logActionError('redeemCouponAction', redeemError);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not redeem right now',
      };
    }

    // Owner notification — non-fatal by contract.
    const { error: notifyError } = await supabase.rpc(
      'notify_coupon_redemption',
      { p_redemption_id: redemption.id },
    );
    if (notifyError) {
      console.error(
        '[redeemCouponAction] notify failed:',
        formatErrorForLog(notifyError),
      );
    }

    return {
      ok: true,
      redemption: {
        id: redemption.id,
        code: redemption.code,
        expires_at: redemption.expires_at,
      },
    };
  } catch (err) {
    logActionError('redeemCouponAction', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not redeem right now',
    };
  }
}
