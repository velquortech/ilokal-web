export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as analyticsService from '@/lib/api/admin/analyticsService';

export async function GET(_request: NextRequest) {
  try {
    const result = await analyticsService.getUsersAnalytics();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/admin/analytics/users]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user analytics',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
