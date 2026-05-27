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

    // Verify coupon exists and is valid
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .eq('status', 'published')
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

    // Check if coupon is still valid (not expired or archived)
    if (coupon.archived_at) {
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
