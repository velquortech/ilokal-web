/**
 * GET /api/payments/history
 * Get user payment history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import type { ApiResponse, PaginatedPaymentsResponse } from '@/lib/types';
import { paymentFiltersSchema } from '@/lib/validation/payments';
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const per_page = parseInt(searchParams.get('per_page') ?? '20');
    const status = searchParams.get('status') as unknown;

    const validation = paymentFiltersSchema.safeParse({
      page,
      per_page,
      status,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filters',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await paymentQuery.getPaymentHistory(
      user.id,
      validation.data,
    );

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
        data: result,
      } as ApiResponse<PaginatedPaymentsResponse>,
      {
        headers: {
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/payments/history]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch payment history',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
