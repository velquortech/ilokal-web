export const dynamic = 'force-dynamic';

/**
 * GET /api/trending - Get trending businesses and products
 * Public endpoint (no authentication required)
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as searchService from '@/lib/api/search/searchService';

// Cache trending results for 5 minutes (300 seconds)
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const period = (searchParams.get('period') || 'week') as
      | 'today'
      | 'week'
      | 'month';
    const type = (searchParams.get('type') || 'all') as
      | 'business'
      | 'product'
      | 'all';
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10)),
      50,
    );

    // Validate period
    if (!['today', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid period: use today, week, or month',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    // Validate type
    if (!['business', 'product', 'all'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid type: use business, product, or all',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    // Fetch trending results
    const result = await searchService.getTrendingService({
      period,
      type,
      limit,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[GET /api/trending]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch trending results',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
