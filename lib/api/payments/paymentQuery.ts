/**
 * Payment & Invoice Query Layer
 * All database read operations
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Payment,
  Invoice,
  PaymentHistoryFilters,
  InvoiceFilters,
  PaymentAnalytics,
} from '@/lib/types';

// ===== Payment Queries =====

/**
 * Get paginated payments for user
 */
export async function getPaymentHistory(
  userId: string,
  filters: PaymentHistoryFilters,
) {
  try {
    const supabase = await createServerSupabaseClient();
    const page = filters.page ?? 1;
    const per_page = filters.per_page ?? 20;
    const offset = (page - 1) * per_page;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('archived_at', null);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const sortBy = filters.sort_by ?? 'newest';
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'amount_asc') {
      query = query.order('amount', { ascending: true });
    } else if (sortBy === 'amount_desc') {
      query = query.order('amount', { ascending: false });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      console.error('[getPaymentHistory]', error);
      return {
        payments: [] as Payment[],
        total: 0,
        error: 'Failed to fetch payments' as const,
      };
    }

    return {
      payments: (data || []) as Payment[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getPaymentHistory]', err);
    return {
      payments: [] as Payment[],
      total: 0,
      error: 'Failed to fetch payments' as const,
    };
  }
}

/**
 * Get single payment by ID
 */
export async function getPaymentById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Payment not found' as const };
    }

    return { payment: data as Payment };
  } catch (err) {
    console.error('[getPaymentById]', err);
    return { error: 'Failed to fetch payment' as const };
  }
}

/**
 * Get payment by Stripe intent ID
 */
export async function getPaymentByStripeIntentId(stripeIntentId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', stripeIntentId)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Payment not found' as const };
    }

    return { payment: data as Payment };
  } catch (err) {
    console.error('[getPaymentByStripeIntentId]', err);
    return { error: 'Failed to fetch payment' as const };
  }
}

/**
 * Check if payment exists
 */
export async function paymentExists(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('archived_at', null);

    return count !== null && count > 0;
  } catch (err) {
    console.error('[paymentExists]', err);
    return false;
  }
}

/**
 * Get payment analytics (admin only)
 */
export async function getPaymentAnalytics(
  period: '7d' | '30d' | '90d',
): Promise<{ analytics: PaymentAnalytics } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const startDate = new Date();

    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === '90d') {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'succeeded')
      .gte('created_at', startDate.toISOString());

    if (!data) {
      return { error: 'Failed to fetch analytics' };
    }

    const payments = (data as Payment[]).filter(
      (p) => p.status && p.payment_method && p.currency,
    );
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byStatus: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};

    payments.forEach((p) => {
      if (p.status && p.payment_method && p.currency) {
        byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
        byMethod[p.payment_method] = (byMethod[p.payment_method] ?? 0) + 1;
        byCurrency[p.currency] =
          (byCurrency[p.currency] ?? 0) + (p.amount || 0);
      }
    });

    return {
      analytics: {
        total_revenue: totalRevenue,
        transaction_count: payments.length,
        average_transaction: totalRevenue / Math.max(payments.length, 1),
        by_status: {
          succeeded: byStatus['succeeded'] ?? 0,
          failed: byStatus['failed'] ?? 0,
          pending: byStatus['pending'] ?? 0,
        },
        by_payment_method: {
          card: byMethod['card'] ?? 0,
          bank_transfer: byMethod['bank_transfer'] ?? 0,
          wallet: byMethod['wallet'] ?? 0,
        },
        by_currency: byCurrency,
      },
    };
  } catch (err) {
    console.error('[getPaymentAnalytics]', err);
    return { error: 'Failed to fetch analytics' };
  }
}

// ===== Invoice Queries =====

/**
 * Get paginated invoices for user
 */
export async function getInvoices(userId: string, filters: InvoiceFilters) {
  try {
    const supabase = await createServerSupabaseClient();
    const page = filters.page ?? 1;
    const per_page = filters.per_page ?? 20;
    const offset = (page - 1) * per_page;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('archived_at', null);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (error) {
      console.error('[getInvoices]', error);
      return {
        invoices: [] as Invoice[],
        total: 0,
        error: 'Failed to fetch invoices' as const,
      };
    }

    return {
      invoices: (data || []) as Invoice[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getInvoices]', err);
    return {
      invoices: [] as Invoice[],
      total: 0,
      error: 'Failed to fetch invoices' as const,
    };
  }
}

/**
 * Get single invoice by ID
 */
export async function getInvoiceById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Invoice not found' as const };
    }

    return { invoice: data as Invoice };
  } catch (err) {
    console.error('[getInvoiceById]', err);
    return { error: 'Failed to fetch invoice' as const };
  }
}

/**
 * Get invoice by number
 */
export async function getInvoiceByNumber(invoiceNumber: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Invoice not found' as const };
    }

    return { invoice: data as Invoice };
  } catch (err) {
    console.error('[getInvoiceByNumber]', err);
    return { error: 'Failed to fetch invoice' as const };
  }
}

/**
 * Check if invoice exists
 */
export async function invoiceExists(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('archived_at', null);

    return count !== null && count > 0;
  } catch (err) {
    console.error('[invoiceExists]', err);
    return false;
  }
}
