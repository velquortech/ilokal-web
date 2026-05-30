/**
 * GET /api/payments/analytics
 * Get payment analytics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
// import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, PaymentAnalytics } from '@/lib/types';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';

export async function GET(req: NextRequest) {
  try {
    const auth = await assertAuthorized(req, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    type PeriodType = '7d' | '30d' | '90d';
    const period =
      (req.nextUrl.searchParams.get('period') as PeriodType) || '30d';

    const result = await paymentQuery.getPaymentAnalytics(period);

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.analytics,
      } as ApiResponse<PaymentAnalytics>,
      {
        headers: {
          'Cache-Control': 'private, max-age=3600, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/payments/analytics]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
