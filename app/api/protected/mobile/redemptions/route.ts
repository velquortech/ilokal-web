import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  forbiddenResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { redeemCouponSchema } from '@/lib/validation/redemptions';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = req.nextUrl;
    const filter = searchParams.get('filter'); // 'active' | 'claimed' | 'expired'

    // Page the wallet so mobile pulls one screen at a time, never the whole
    // history in a single batch. per_page is capped to keep payloads bounded.
    const page = Math.max(
      1,
      parseInt(searchParams.get('page') ?? '1', 10) || 1,
    );
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '10', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 10),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = auth.supabase
      .from('user_redemptions')
      .select(
        `
        id, redeemed_at, expires_at, is_claimed, code,
        coupons(id, code, description, discount, expiry_date, promotion_type,
          businesses(id, shop_name, logo_url)
        ),
        branches(id, name, address)
      `,
        { count: 'exact' },
      )
      .eq('user_id', auth.user.id)
      .order('redeemed_at', { ascending: false });

    const now = new Date().toISOString();
    if (filter === 'active') {
      query = query
        .eq('is_claimed', false)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
    } else if (filter === 'claimed') {
      query = query.eq('is_claimed', true);
    } else if (filter === 'expired') {
      query = query
        .eq('is_claimed', false)
        .not('expires_at', 'is', null)
        .lt('expires_at', now);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) return loggedServerError('protected/mobile/redemptions', error);

    const hasMore = count != null && from + (data?.length ?? 0) < count;

    return successResponse({ redemptions: data, has_more: hasMore });
  } catch {
    return generalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const parsed = redeemCouponSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return badRequestResponse({
        message: 'coupon_id and branch_id must be valid UUIDs',
      });
    }
    const { coupon_id, branch_id } = parsed.data;

    const now = new Date().toISOString();

    const { data: coupon, error: couponError } = await auth.supabase
      .from('coupons')
      .select(
        'id, start_date, expiry_date, status, max_redemptions_per_user, max_redemptions_global, current_redemptions, requires_follow, business_id',
      )
      .eq('id', coupon_id)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .single();

    if (couponError || !coupon) {
      return badRequestResponse({
        message: 'Coupon not found or not yet active',
      });
    }

    if (coupon.expiry_date < now) {
      return badRequestResponse({ message: 'Coupon has expired' });
    }

    if (
      coupon.max_redemptions_global !== null &&
      (coupon.current_redemptions ?? 0) >= coupon.max_redemptions_global
    ) {
      return badRequestResponse({
        message: 'Coupon has reached its redemption limit',
      });
    }

    // Follow gate — coupon requires user to follow the business
    if (coupon.requires_follow) {
      const { count: followCount, error: followError } = await auth.supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.user.id)
        .eq('business_id', coupon.business_id);

      if (followError)
        return loggedServerError('protected/mobile/redemptions', followError);

      if ((followCount ?? 0) === 0) {
        return forbiddenResponse({
          message: 'Follow this business to claim this deal',
        });
      }
    }

    // This user's redemptions of this coupon back both the active-dupe guard
    // and the per-user cap below — fetch once instead of counting twice.
    const { data: userRedemptions, error: redemptionsError } =
      await auth.supabase
        .from('user_redemptions')
        .select('is_claimed, expires_at')
        .eq('coupon_id', coupon_id)
        .eq('user_id', auth.user.id);

    if (redemptionsError) {
      return loggedServerError(
        'protected/mobile/redemptions',
        redemptionsError,
      );
    }

    // Active-dupe — user can't hold two unclaimed, unexpired redemptions of the same coupon.
    const hasActiveRedemption = userRedemptions.some(
      (r) => !r.is_claimed && (r.expires_at === null || r.expires_at > now),
    );
    if (hasActiveRedemption) {
      return badRequestResponse({
        message: 'You already have this deal in your wallet',
      });
    }

    if (
      coupon.max_redemptions_per_user !== null &&
      userRedemptions.length >= coupon.max_redemptions_per_user
    ) {
      return badRequestResponse({
        message:
          'You have already redeemed this coupon the maximum number of times',
      });
    }

    const expires_at = coupon.expiry_date;

    const { data, error } = await auth.supabase
      .from('user_redemptions')
      .insert({
        user_id: auth.user.id,
        coupon_id,
        branch_id,
        expires_at,
      })
      .select()
      .single();

    if (error) return loggedServerError('protected/mobile/redemptions', error);

    // Atomic increment — DB function updates current_redemptions + 1 only if still
    // under max_redemptions_global, catching the race between the cap check above
    // and concurrent inserts. Returns false if the cap was exceeded by a concurrent
    // request; we still return success (the insert already landed) but log the race.
    const { data: incremented, error: incrError } = await auth.supabase.rpc(
      'increment_coupon_redemptions',
      { p_coupon_id: coupon_id },
    );
    if (incrError) {
      console.error(
        '[redemptions] counter increment failed:',
        incrError.message,
      );
    } else if (!incremented) {
      // Cap was exceeded by a concurrent insert — roll back this row.
      await auth.supabase.from('user_redemptions').delete().eq('id', data.id);
      return badRequestResponse({
        message: 'Coupon has reached its redemption limit',
      });
    }

    // Notify the business owner — names the customer, coupon, and branch. The RPC
    // is SECURITY DEFINER and authorizes this caller as the redemption's owner.
    // Non-fatal: a notification failure must never break the redemption.
    const { error: notifyError } = await auth.supabase.rpc(
      'notify_coupon_redemption',
      { p_redemption_id: data.id },
    );
    if (notifyError) {
      console.error('[redemptions] notify failed:', notifyError.message);
    }

    return successResponse({ redemption: data });
  } catch {
    return generalErrorResponse();
  }
}
