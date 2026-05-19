export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as analyticsService from '@/lib/api/admin/analyticsService';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const result = await analyticsService.getBusinessAnalytics();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/admin/analytics/businesses]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch business analytics',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
