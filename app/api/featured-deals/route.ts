/**
 * GET /api/featured-deals
 * List public featured deals with caching
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { featuredDealFiltersSchema } from '@/lib/validation/coupons';
import * as couponQuery from '@/lib/api/coupons/couponQuery';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? parseInt(searchParams.get('per_page')!)
        : 20,
      placement: searchParams.get('placement') as
        | 'category_page'
        | 'homepage_banner'
        | 'search_featured'
        | undefined,
      sort_by: (searchParams.get('sort_by') || 'newest') as
        | 'newest'
        | 'oldest'
        | 'expiry_asc'
        | 'expiry_desc',
    };

    const validation = featuredDealFiltersSchema.safeParse(params);
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

    const result = await couponQuery.getFeaturedDealsPaginated(validation.data);

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
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/featured-deals]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch featured deals',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
