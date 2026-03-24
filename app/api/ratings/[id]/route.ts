export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as reviewService from '@/lib/api/reviews/reviewService';

export async function GET(request: NextRequest) {
  try {
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];
    const type = (request.nextUrl.searchParams.get('type') || 'business') as
      | 'business'
      | 'product';
    const result = await reviewService.getRating(id, type);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/ratings/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rating' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
