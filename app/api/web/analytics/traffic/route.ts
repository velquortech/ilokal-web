export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as subscriptionQuery from '@/lib/api/getUserBusiness';
import * as service from '@/lib/api/analytics/businessAnalyticsService';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    const businessId = request.nextUrl.searchParams.get('business_id') || '';
    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'business_id required' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    // Verify business ownership
    const businessResult = await subscriptionQuery.getUserBusiness(
      auth.user.id,
    );
    if ('error' in businessResult || businessResult.data.id !== businessId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message:
              'You do not have permission to view this business analytics',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    const result = await service.getTrafficMetrics(businessId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/analytics/traffic]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
