/**
 * POST /api/payments/checkout
 * Create payment checkout session (Stripe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, StripeCheckoutSession } from '@/lib/types';
import { checkoutRequestSchema } from '@/lib/validation/payments';
import * as paymentService from '@/lib/api/payments/paymentService';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validation = checkoutRequestSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: fieldErrors.amount?.[0] || 'Invalid checkout request',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await paymentService.createCheckoutSession(
      user.id,
      validation.data,
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.code === 'AUTHENTICATION_ERROR' ? 401 : 500,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      } as ApiResponse<StripeCheckoutSession>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/payments/checkout]', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create checkout session',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
