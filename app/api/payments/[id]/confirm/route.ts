/**
 * POST /api/payments/:id/confirm
 * Confirm payment (webhook or user action)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, StripePaymentConfirm } from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as paymentService from '@/lib/api/payments/paymentService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Require authentication for confirming payments
    const auth = await assertAuthorized(req);
    if (!auth.authorized) return auth.error;

    const { id } = await params;

    const result = await paymentService.confirmPayment(id);

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'NOT_FOUND' ? 404 : 500,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      } as ApiResponse<StripePaymentConfirm>,
      { status: 200 },
    );
  } catch (err) {
    console.error('[POST /api/payments/:id/confirm]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm payment',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
