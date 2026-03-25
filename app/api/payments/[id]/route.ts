/**
 * GET /api/payments/:id
 * Get payment details
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse, Payment } from '@/lib/types';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized();
    if (!auth.authorized) return auth.error;
    const userId = auth.user.id;

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
    if (payment.user_id !== userId) {
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
