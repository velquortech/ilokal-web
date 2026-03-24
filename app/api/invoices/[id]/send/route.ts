/**
 * POST /api/invoices/:id/send
 * Send invoice via email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse } from '@/lib/types';
import { invoiceEmailSchema } from '@/lib/validation/payments';
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

    const { id } = await params;
    const body = await req.json();

    const validation = invoiceEmailSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: fieldErrors.recipient_email?.[0] || 'Invalid email',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await paymentService.sendInvoiceEmail(
      id,
      validation.data.recipient_email,
    );

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
    console.error('[POST /api/invoices/:id/send]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send invoice',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
