/**
 * GET /api/coupons
 * List coupons for authenticated user's business
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type { ApiResponse } from '@/lib/types';
import { couponFiltersSchema } from '@/lib/validation/coupons';
import * as couponQuery from '@/lib/api/coupons/couponQuery';

export async function GET(req: NextRequest) {
  try {
    // Verify business owner session
    const auth = await verifyBusinessOwner();
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || {
            code: 'AUTHORIZATION_ERROR',
            message: 'Unauthorized',
          },
        } as ApiResponse<null>,
        { status: auth.error?.code === 'AUTHENTICATION_ERROR' ? 401 : 403 },
      );
    }

    const business = auth.business!;

    const searchParams = req.nextUrl.searchParams;

    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? parseInt(searchParams.get('per_page')!)
        : 20,
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') || 'active') as
        | 'active'
        | 'expired'
        | 'all',
      sort_by: (searchParams.get('sort_by') || 'newest') as
        | 'newest'
        | 'oldest'
        | 'expiry_asc'
        | 'expiry_desc',
    };

    const validation = couponFiltersSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await couponQuery.getCouponsPaginated(
      business.id,
      validation.data,
    );

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      } as ApiResponse<typeof result>,
      {
        headers: {
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/coupons]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch coupons',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
