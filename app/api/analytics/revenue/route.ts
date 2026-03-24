export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as service from '@/lib/api/analytics/businessAnalyticsService';

export async function GET(request: NextRequest) {
  try {
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
    const result = await service.getBusinessRevenue(businessId);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/analytics/revenue]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
