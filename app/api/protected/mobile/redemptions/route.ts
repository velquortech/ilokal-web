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
        coupons(id, title, description, type, redeem_time_limit_minutes,
          businesses(id, shop_name, logo_url)
        ),
        branches(id, name, address)
      `,
      )
      .eq('user_id', auth.user.id)
      .order('redeemed_at', { ascending: false });

    const now = new Date().toISOString();
    if (filter === 'active') {
      query = query.eq('is_claimed', false).gt('expires_at', now);
    } else if (filter === 'claimed') {
      query = query.eq('is_claimed', true);
    } else if (filter === 'expired') {
      query = query.eq('is_claimed', false).lt('expires_at', now);
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
      .select('id, redeem_time_limit_minutes, end_date')
      .eq('id', coupon_id)
      .is('archived_at', null)
      .single();

    if (couponError || !coupon) {
      return badRequestResponse({ message: 'Coupon not found or expired' });
    }

    const expires_at = coupon.redeem_time_limit_minutes
      ? new Date(
          Date.now() + coupon.redeem_time_limit_minutes * 60 * 1000,
        ).toISOString()
      : null;

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

    return successResponse({ redemption: data });
  } catch {
    return generalErrorResponse();
  }
}
