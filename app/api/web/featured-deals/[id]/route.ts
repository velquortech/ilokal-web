/**
 * GET /api/featured-deals/:id
 * Get featured deal details
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, FeaturedDeal } from '@/lib/types';
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
            message: 'Featured deal ID is required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await couponQuery.getFeaturedDealById(id);

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

    return NextResponse.json(
      {
        success: true,
        data: result.deal,
      } as ApiResponse<FeaturedDeal>,
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/featured-deals/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch featured deal',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
