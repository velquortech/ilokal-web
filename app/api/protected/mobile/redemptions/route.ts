import { getMobileUser } from '@/app/api/helpers/mobile-auth';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = req.nextUrl;
    const filter = searchParams.get('filter'); // 'active' | 'claimed' | 'expired'

    let query = auth.supabase
      .from('user_redemptions')
      .select(
        `
        id, redeemed_at, expires_at, is_claimed,
        coupons(id, code, description, discount, expiry_date,
          businesses(id, shop_name, logo_url)
        ),
        branches(id, name, address)
      `,
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

    const { data, error } = await query;

    if (error) return generalErrorResponse({ message: error.message });

    return successResponse({ redemptions: data });
  } catch {
    return generalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { coupon_id, branch_id } = body;

    if (!coupon_id || !branch_id) {
      return badRequestResponse({
        message: 'coupon_id and branch_id are required',
      });
    }

    const { data: coupon, error: couponError } = await auth.supabase
      .from('coupons')
      .select(
        'id, expiry_date, status, max_redemptions_per_user, max_redemptions_global, current_redemptions',
      )
      .eq('id', coupon_id)
      .eq('status', 'published')
      .is('archived_at', null)
      .single();

    if (couponError || !coupon) {
      return badRequestResponse({ message: 'Coupon not found or expired' });
    }

    if (new Date(coupon.expiry_date) < new Date()) {
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

    if (coupon.max_redemptions_per_user !== null) {
      const { count, error: countError } = await auth.supabase
        .from('user_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon_id)
        .eq('user_id', auth.user.id);

      if (countError) {
        return generalErrorResponse({ message: countError.message });
      }

      if ((count ?? 0) >= coupon.max_redemptions_per_user) {
        return badRequestResponse({
          message:
            'You have already redeemed this coupon the maximum number of times',
        });
      }
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

    if (error) return generalErrorResponse({ message: error.message });

    // Increment the global redemption counter (best-effort; minor TOCTOU acceptable at low concurrency)
    await auth.supabase
      .from('coupons')
      .update({ current_redemptions: (coupon.current_redemptions ?? 0) + 1 })
      .eq('id', coupon_id);

    return successResponse({ redemption: data });
  } catch {
    return generalErrorResponse();
  }
}
