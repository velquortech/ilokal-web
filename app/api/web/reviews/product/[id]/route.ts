export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as reviewService from '@/lib/api/reviews/reviewService';

export async function GET(request: NextRequest) {
  try {
    const parts = request.nextUrl.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1] ?? '';
    const page = Math.max(
      1,
      parseInt(request.nextUrl.searchParams.get('page') || '1', 10),
    );
    const per_page = Math.min(
      Math.max(
        1,
        parseInt(request.nextUrl.searchParams.get('per_page') || '20', 10),
      ),
      100,
    );
    const result = await reviewService.listReviewsForProduct(
      id,
      page,
      per_page,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/reviews/product/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product reviews',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
