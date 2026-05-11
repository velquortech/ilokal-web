/**
 * POST /api/payments/:id/refund
 * Refund payment (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as paymentService from '@/lib/api/payments/paymentService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Require admin role
    const auth = await assertAuthorized(req, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const { id } = await params;

    const result = await paymentService.refundPayment(id);

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'NOT_FOUND' ? 404 : 500,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: null,
      } as ApiResponse<null>,
      { status: 200 },
    );
  } catch (err) {
    console.error('[POST /api/payments/:id/refund]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refund payment',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
