export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as reviewService from '@/lib/api/reviews/reviewService';
import { updateReviewSchema } from '@/lib/validation/reviews';
import type { UpdateReviewRequest } from '@/lib/types';

export async function PUT(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];
    const body = await request.json();
    const parsed = updateReviewSchema.parse(body);
    const result = await reviewService.updateReview(
      id,
      parsed as UpdateReviewRequest,
      { userId: auth.user.id, role: auth.profile.role },
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[PUT /api/reviews/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: (error as Error).message },
      } as ApiResponse<null>,
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];
    const result = await reviewService.deleteReview(id, {
      userId: auth.user.id,
      role: auth.profile.role,
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[DELETE /api/reviews/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
