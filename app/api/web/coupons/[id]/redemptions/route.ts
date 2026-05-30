/**
 * GET /api/web/coupons/:id/redemptions
 * Returns redemption stats for a coupon.
 * Requires the caller to be the authenticated owner of the business that owns the coupon.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, RedemptionStats } from '@/lib/types';
import * as couponQuery from '@/lib/api/coupons/couponQuery';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized) {
      const isUnauthenticated =
        verify.error &&
        typeof verify.error === 'object' &&
        'code' in verify.error &&
        (verify.error as { code: string }).code === 'AUTHENTICATION_ERROR';

      return NextResponse.json(
        {
          success: false,
          error: {
            code: isUnauthenticated ? 'AUTHENTICATION_ERROR' : 'FORBIDDEN',
            message: 'Unauthorized',
          },
        } as ApiResponse<null>,
        { status: isUnauthenticated ? 401 : 403 },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Coupon ID is required' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const couponResult = await couponQuery.getCouponById(id);
    if ('error' in couponResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Coupon not found' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    if (couponResult.coupon.business_id !== verify.business!.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this coupon',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    const stats = await couponQuery.getRedemptionStats(id);

    return NextResponse.json(
      { success: true, data: stats } as ApiResponse<RedemptionStats>,
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[GET /api/web/coupons/:id/redemptions]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch redemption stats',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
