/**
 * GET /api/payments/:id
 * Get payment details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import type { ApiResponse, Payment } from '@/lib/types';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const result = await paymentQuery.getPaymentById(id);

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const payment = result.payment;

    // Verify ownership
    if (payment.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to view this payment',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: payment,
      } as ApiResponse<Payment>,
      {
        headers: {
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/payments/:id]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch payment',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
