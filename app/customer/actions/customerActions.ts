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
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import {
  requestBooking,
  cancelBooking,
} from '@/lib/api/bookings/bookingService';
import { ROUTES } from '@/config/routeConfig';
import type { BookingRequest } from '@/lib/types/booking';

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
        'id, start_date, expiry_date, status, max_redemptions_per_user, max_redemptions_global, current_redemptions, requires_follow, business_id, branch_id, businesses!business_id (archived_at)',
      )
      .eq('id', couponId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .single();

    // An archived business's coupons stay readable through the coupon RLS
    // policy (it checks verified only) — treat them as not found here.
    const businessArchived =
      (coupon as unknown as { businesses?: { archived_at: string | null } })
        ?.businesses?.archived_at != null;

    if (couponError || !coupon || businessArchived) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Coupon not found or not yet active',
      };
    }

    // Branch must belong to the coupon's business, and a branch-scoped coupon
    // may only be redeemed at its branch. (Gate added on web first — the
    // mobile route shares the gap; align it in the shared-core follow-up.)
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, business_id')
      .eq('id', branchId)
      .is('archived_at', null)
      .maybeSingle();

    if (branchError) {
      console.error('[redeemCouponAction]', branchError);
      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: 'Could not redeem right now',
      };
    }
    if (
      !branch ||
      branch.business_id !== coupon.business_id ||
      (coupon.branch_id !== null && coupon.branch_id !== branchId)
    ) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'This deal cannot be redeemed at that branch',
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

// ---------------------------------------------------------------------------
// Bookings (phase 4). The gate matrix, the authorization split, and the ATOMIC
// availability check all live in the `request_booking` / `cancel_booking` RPCs
// (`20260727000005`) — these actions only authenticate the caller, validate
// the shape, and translate errors. Deliberately thin: duplicating the gates
// here is how the redeem path ended up with two divergent copies.
// ---------------------------------------------------------------------------

interface BookingSuccess {
  ok: true;
  booking: BookingRequest;
}

const bookingInputSchema = z.object({
  product_id: z.guid(),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
  branch_id: z.guid().nullable().optional(),
  party_size: z.number().int().positive().max(999).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function requestBookingAction(
  input: unknown,
): Promise<BookingSuccess | ActionFailure> {
  try {
    const auth = await requireCustomer();
    if ('ok' in auth) return auth;

    const parsed = bookingInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'Please check the booking details and try again',
      };
    }

    const result = await requestBooking(parsed.data);
    if (!result.success || !result.data) {
      return {
        ok: false,
        // The RPC's own SQLSTATE mapping already produced user-safe copy.
        code:
          result.error?.code === 'UNAUTHORIZED'
            ? 'AUTH_REQUIRED'
            : 'BAD_REQUEST',
        message: result.error?.message ?? 'Could not request this booking',
      };
    }

    revalidatePath(ROUTES.CUSTOMER.BOOKINGS);
    return { ok: true, booking: result.data };
  } catch (err) {
    console.error('[requestBookingAction]', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not request this booking right now',
    };
  }
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<BookingSuccess | ActionFailure> {
  try {
    const auth = await requireCustomer();
    if ('ok' in auth) return auth;

    if (!guid.safeParse(bookingId).success) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: 'booking_id must be a valid UUID',
      };
    }

    const result = await cancelBooking(bookingId);
    if (!result.success || !result.data) {
      return {
        ok: false,
        code: 'BAD_REQUEST',
        message: result.error?.message ?? 'Could not cancel this booking',
      };
    }

    revalidatePath(ROUTES.CUSTOMER.BOOKINGS);
    return { ok: true, booking: result.data };
  } catch (err) {
    console.error('[cancelBookingAction]', err);
    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not cancel this booking right now',
    };
  }
}
