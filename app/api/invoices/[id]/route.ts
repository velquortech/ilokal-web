/**
 * GET /api/invoices/:id
 * Get invoice details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, Invoice } from '@/lib/types';
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

    const result = await paymentQuery.getInvoiceById(id);

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

    const invoice = result.invoice;

    // Verify ownership
    if (invoice.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to view this invoice',
          },
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: invoice,
      } as ApiResponse<Invoice>,
      {
        headers: {
          'Cache-Control': 'private, max-age=300, must-revalidate',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/invoices/:id]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch invoice',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
