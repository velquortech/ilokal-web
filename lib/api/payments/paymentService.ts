/**
 * Payment & Invoice Service Layer
 * Business logic for payments and invoices
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Invoice,
  ApiResponse,
  CreateInvoiceRequest,
  CheckoutRequest,
  StripeCheckoutSession,
  StripePaymentConfirm,
} from '@/lib/types';
import * as paymentQuery from './paymentQuery';

// Stripe would be imported from '@stripe/stripe-js' or '@stripe/stripe-node'
// For now, we'll stub the integration
// const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
// const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY || '';

// ===== Payment Service =====

/**
 * Create payment checkout session (Stripe)
 */
export async function createCheckoutSession(
  userId: string,
  input: CheckoutRequest,
): Promise<ApiResponse<StripeCheckoutSession>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Validate user exists
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not found',
        },
      };
    }

    // Create payment record in pending state
    const paymentId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('payments').insert({
      id: paymentId,
      user_id: userId,
      business_id: input.business_id || null,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      payment_method: input.payment_method,
      stripe_payment_intent_id: null,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[createCheckoutSession] Insert error:', insertError);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment',
        },
      };
    }

    // TODO: Call Stripe API to create CheckoutSession
    // For now, return mock session
    const mockSession: StripeCheckoutSession = {
      id: `cs_${crypto.randomUUID().split('-')[0]}`,
      url: `https://checkout.stripe.com/pay/${paymentId}`,
      client_secret: `seti_${crypto.randomUUID().split('-')[0]}`,
    };

    return {
      success: true,
      data: mockSession,
    };
  } catch (err) {
    console.error('[createCheckoutSession]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create checkout session',
      },
    };
  }
}

/**
 * Confirm payment (Stripe webhook)
 */
export async function confirmPayment(
  paymentId: string,
): Promise<ApiResponse<StripePaymentConfirm>> {
  try {
    const result = await paymentQuery.getPaymentById(paymentId);

    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found',
        },
      };
    }

    const payment = result.payment;
    const supabase = await createServerSupabaseClient();

    // Update payment status to succeeded
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('[confirmPayment] Update error:', updateError);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm payment',
        },
      };
    }

    // Auto-generate invoice if user_id is present
    // Currency is always PHP (enforced by validation layer)
    if (payment.user_id) {
      await createInvoice(payment.user_id, {
        payment_id: paymentId,
        amount: payment.amount,
        currency: 'PHP',
        business_id: payment.business_id || undefined,
      });
    }

    return {
      success: true,
      data: {
        status: 'succeeded',
      },
    };
  } catch (err) {
    console.error('[confirmPayment]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to confirm payment',
      },
    };
  }
}

/**
 * Refund payment (admin only)
 */
export async function refundPayment(
  paymentId: string,
): Promise<ApiResponse<null>> {
  try {
    const result = await paymentQuery.getPaymentById(paymentId);

    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment not found',
        },
      };
    }

    const payment = result.payment;

    if (payment.status !== 'succeeded') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only succeeded payments can be refunded',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    // Update payment status to refunded (handled via archived_at)
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'canceled',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('[refundPayment] Update error:', updateError);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refund payment',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[refundPayment]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refund payment',
      },
    };
  }
}

// ===== Invoice Service =====

/**
 * Generate invoice number (INV-YYYYMMDD-XXXXX)
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `INV-${date}-${random}`;
}

/**
 * Create invoice (auto-called on payment success)
 */
export async function createInvoice(
  userId: string,
  input: CreateInvoiceRequest,
): Promise<ApiResponse<Invoice>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Validate user exists
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not found',
        },
      };
    }

    const invoiceId = crypto.randomUUID();
    const invoiceNumber = generateInvoiceNumber();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        payment_id: input.payment_id || null,
        user_id: userId,
        business_id: input.business_id || null,
        amount: input.amount,
        currency: input.currency,
        status: 'draft',
        invoice_number: invoiceNumber,
        due_date: input.due_date || null,
        email_sent_at: null,
        paid_at: null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[createInvoice] Insert error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create invoice',
        },
      };
    }

    return {
      success: true,
      data: data as Invoice,
    };
  } catch (err) {
    console.error('[createInvoice]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create invoice',
      },
    };
  }
}

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  _recipientEmail: string,
): Promise<ApiResponse<null>> {
  try {
    const result = await paymentQuery.getInvoiceById(invoiceId);

    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    // TODO: Send email via email service (SendGrid, Resend, etc.)
    // For now, just update sent timestamp
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[sendInvoiceEmail] Update error:', updateError);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send invoice email',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[sendInvoiceEmail]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send invoice email',
      },
    };
  }
}
