/**
 * GET /api/payments/analytics
 * Get payment analytics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, PaymentAnalytics } from '@/lib/types';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'You must be logged in',
          },
        } as ApiResponse<null>,
        { status: 401 },
      );
    }

    // Verify admin role
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminUser?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Only admins can view analytics',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

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
