import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { redeemCouponSchema } from '@/lib/validation/redemptions';
import { redemptionErrorResponse } from '@/app/api/helpers/redemptionErrors';
import { NextRequest } from 'next/server';

const CONTEXT = 'protected/mobile/redemptions';

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

    // Every claim gate (published/started/expired, verified business, branch
    // ownership, follow gate, active-dupe, per-user + global caps), the insert
    // and the counter bump run inside this one RPC under the coupon row lock
    // (migration 20261024000000). Direct writes to user_redemptions are
    // revoked, so the gates can't be skipped by calling PostgREST directly.
    const { data, error } = await auth.supabase.rpc('redeem_coupon', {
      p_coupon_id: coupon_id,
      p_branch_id: branch_id,
    });

    if (error) return redemptionErrorResponse(CONTEXT, error, auth.user.id);

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
