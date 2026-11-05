import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { ApiResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import {
  REDEMPTION_ERROR_STATUS,
  redemptionErrorCode,
} from '@/app/api/helpers/redemptionErrors';
import { isValidResourceId } from '@/app/api/helpers/resourceId';

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

    if (!isValidResourceId(couponId) || !isValidResourceId(branch_id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'coupon id and branch_id must be valid UUIDs',
          },
        },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // All gates + insert + counter bump live in the RPC (migration
    // 20261024000000), shared with the mobile route and the web action.
    const { data: redemption, error: redeemError } = await supabase.rpc(
      'redeem_coupon',
      { p_coupon_id: couponId, p_branch_id: branch_id },
    );

    if (redeemError || !redemption) {
      const code = redeemError ? redemptionErrorCode(redeemError) : null;
      if (code) {
        return NextResponse.json(
          {
            success: false,
            error: { code, message: redeemError?.hint || code },
          },
          { status: REDEMPTION_ERROR_STATUS[code] },
        );
      }
      console.error(
        '[POST /api/coupons/[id]/redeem] DB error:',
        formatErrorForLog(redeemError),
      );
      return NextResponse.json(
        {
          success: false,
          error: { code: 'DB_ERROR', message: 'Failed to redeem coupon' },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: redemption,
    });
  } catch (error) {
    console.error(
      '[POST /api/coupons/[id]/redeem] unexpected error:',
      formatErrorForLog(error),
    );
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
