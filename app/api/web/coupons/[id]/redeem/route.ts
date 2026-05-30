import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { ApiResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/coupons/[couponId]/redeem - User redeems a coupon
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id: couponId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be logged in to redeem coupons',
          },
        },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { branch_id } = body;

    if (!branch_id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'branch_id is required' },
        },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    // Verify coupon exists and satisfies the full access invariant at query time
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('id, expiry_date, max_redemptions_global')
      .eq('id', couponId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Coupon not found' },
        },
        { status: 404 },
      );
    }

    if (new Date(coupon.expiry_date) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'EXPIRED', message: 'Coupon has expired' },
        },
        { status: 410 },
      );
    }

    // Check if user has already redeemed this coupon
    const { data: existing } = await supabase
      .from('user_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('coupon_id', couponId)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_REDEEMED',
            message: 'You have already redeemed this coupon',
          },
        },
        { status: 409 },
      );
    }

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('user_redemptions')
      .insert([
        {
          user_id: user.id,
          coupon_id: couponId,
          branch_id,
          redeemed_at: new Date().toISOString(),
          is_claimed: false,
          expires_at: coupon.expiry_date,
        },
      ])
      .select()
      .single();

    if (redemptionError) {
      console.error(
        '[POST /api/coupons/[id]/redeem] DB error:',
        redemptionError,
      );
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DB_ERROR', message: redemptionError.message },
        },
        { status: 500 },
      );
    }

    // Atomic global-cap enforcement — RPC returns false when a concurrent insert
    // already filled the last slot. Roll back the over-cap row in that case.
    if (coupon.max_redemptions_global !== null) {
      const { data: incremented, error: incrError } = await supabase.rpc(
        'increment_coupon_redemptions',
        { p_coupon_id: couponId },
      );
      if (incrError) {
        console.error(
          '[POST /api/coupons/[id]/redeem] counter increment failed:',
          incrError.message,
        );
      } else if (!incremented) {
        await supabase
          .from('user_redemptions')
          .delete()
          .eq('id', redemption.id);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'COUPON_LIMIT_REACHED',
              message: 'Coupon redemption limit reached',
            },
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: redemption,
    });
  } catch (error) {
    console.error('[POST /api/coupons/[id]/redeem] unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while redeeming coupon',
        },
      },
      { status: 500 },
    );
  }
}
