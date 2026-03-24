export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews - List reviews or POST create review
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as reviewService from '@/lib/api/reviews/reviewService';
import { createReviewSchema } from '@/lib/validation/reviews';
import type { CreateReviewRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const per_page = Math.min(
      Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10)),
      100,
    );

    const result = await reviewService.listReviews(page, per_page);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/reviews]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list reviews' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate
    const parsed = createReviewSchema.parse(body);
    const result = await reviewService.createReview(
      parsed as CreateReviewRequest,
    );
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    console.error('[POST /api/reviews]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: (error as Error).message },
      } as ApiResponse<null>,
      { status: 400 },
    );
  }
}
