/**
 * GET /api/coupons/:id
 * Get coupon details and redemption stats
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, CouponDetailResponse } from '@/lib/types';
import * as couponQuery from '@/lib/api/coupons/couponQuery';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Coupon ID is required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await couponQuery.getCouponById(id);

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    // Get redemption stats
    const stats = await couponQuery.getRedemptionStats(id);

    return NextResponse.json(
      {
        success: true,
        data: {
          coupon: result.coupon,
          stats,
        },
      } as ApiResponse<CouponDetailResponse>,
      {
        headers: {
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/coupons/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch coupon',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
