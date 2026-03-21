/**
 * POST /api/payments/:id/refund
 * Refund payment (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import type { ApiResponse } from '@/lib/types';
import * as paymentService from '@/lib/api/payments/paymentService';

export async function POST(
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
            message: 'Only admins can refund payments',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

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
