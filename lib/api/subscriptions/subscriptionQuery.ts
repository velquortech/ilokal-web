/**
 * Subscription query layer - Database read operations
 * All subscription, plan, and billing-related queries
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionPaymentMethod,
  SubscriptionUsage,
  SubscriptionWithUsageResponse,
  BillingInvoice,
} from '@/lib/types';
import type {
  SubscriptionFiltersInput,
  InvoiceFiltersInput,
  PaymentMethodFiltersInput,
} from '@/lib/validation/subscriptions';

/**
 * Get all subscription plans (public)
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .is('archived_at', null)
    .order('monthly_price_cents', { ascending: true });

  if (error) {
    console.error('[getSubscriptionPlans]', error);
    return [];
  }

  return data || [];
}

/**
 * Get single subscription plan by ID
 */
export async function getSubscriptionPlanById(
  planId: string,
): Promise<{ data: SubscriptionPlan } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .is('archived_at', null)
    .single();

  if (error) {
    console.error('[getSubscriptionPlanById]', error);
    return { error: 'Plan not found' };
  }

  return { data: data as SubscriptionPlan };
}

/**
 * Get business's active subscription
 */
export async function getActiveSubscription(
  businessId: string,
): Promise<{ data: Subscription } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .is('archived_at', null)
    .single();

  if (error) {
    // No subscription found is not an error - they might be on free tier
    return { error: 'No active subscription' };
  }

  return { data: data as Subscription };
}

/**
 * Get subscription by ID with ownership check ready
 */
export async function getSubscriptionById(
  subscriptionId: string,
): Promise<{ data: Subscription } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .is('archived_at', null)
    .single();

  if (error) {
    console.error('[getSubscriptionById]', error);
    return { error: 'Subscription not found' };
  }

  return { data: data as Subscription };
}

/**
 * Get paginated subscriptions for business
 */
export async function getSubscriptionHistory(
  businessId: string,
  filters: SubscriptionFiltersInput,
): Promise<{
  data: Subscription[];
  total: number;
}> {
  const supabase = await createServerSupabaseClient();
  const { page = 1, per_page = 10, status } = filters;
  const offset = (page - 1) * per_page;

  let query = supabase
    .from('subscriptions')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .is('archived_at', null)
    .range(offset, offset + per_page - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    console.error('[getSubscriptionHistory]', error);
    return { data: [], total: 0 };
  }

  return { data: data as Subscription[], total: count || 0 };
}

/**
 * Check if subscription exists
 */
export async function subscriptionExists(
  subscriptionId: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact' })
    .eq('id', subscriptionId)
    .is('archived_at', null);

  if (error) {
    console.error('[subscriptionExists]', error);
    return false;
  }

  return count !== null && count > 0;
}

/**
 * Get payment method by ID
 */
export async function getPaymentMethodById(
  paymentMethodId: string,
  businessId?: string,
): Promise<{ data: SubscriptionPaymentMethod } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('payment_methods')
    .select('*')
    .eq('id', paymentMethodId)
    .is('archived_at', null);

  if (businessId) query = query.eq('business_id', businessId);

  const { data, error } = await query.single();

  if (error) {
    console.error('[getPaymentMethodById]', error);
    return { error: 'Payment method not found' };
  }

  return { data: data as SubscriptionPaymentMethod };
}

/**
 * Get all payment methods for business
 */
export async function getPaymentMethods(
  businessId: string,
  filters?: PaymentMethodFiltersInput,
): Promise<{ data: SubscriptionPaymentMethod[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  const { page = 1, per_page = 20, type } = filters || {};
  const offset = (page - 1) * per_page;

  let query = supabase
    .from('payment_methods')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .is('archived_at', null)
    .range(offset, offset + per_page - 1);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, count, error } = await query.order('is_default', {
    ascending: false,
  });

  if (error) {
    console.error('[getPaymentMethods]', error);
    return { data: [], total: 0 };
  }

  return { data: data as SubscriptionPaymentMethod[], total: count || 0 };
}

/**
 * Get default payment method for business
 */
export async function getDefaultPaymentMethod(
  businessId: string,
): Promise<{ data: SubscriptionPaymentMethod } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_default', true)
    .is('archived_at', null)
    .single();

  if (error) {
    return { error: 'No default payment method' };
  }

  return { data: data as SubscriptionPaymentMethod };
}

/**
 * Get billing invoices for business
 */
export async function getBillingInvoices(
  businessId: string,
  filters?: InvoiceFiltersInput,
): Promise<{ data: BillingInvoice[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  const {
    page = 1,
    per_page = 10,
    status,
    start_date,
    end_date,
    sort_by = 'newest',
  } = filters || {};
  const offset = (page - 1) * per_page;

  let query = supabase
    .from('billing_invoices')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .is('archived_at', null)
    .range(offset, offset + per_page - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (start_date) {
    query = query.gte('created_at', start_date);
  }

  if (end_date) {
    query = query.lte('created_at', end_date);
  }

  const orderDirection = sort_by?.includes('asc') ? true : false;
  const orderBy =
    sort_by === 'amount_asc' || sort_by === 'amount_desc'
      ? 'amount_cents'
      : 'created_at';

  const { data, count, error } = await query.order(orderBy, {
    ascending: orderDirection,
  });

  if (error) {
    console.error('[getBillingInvoices]', error);
    return { data: [], total: 0 };
  }

  return { data: data as BillingInvoice[], total: count || 0 };
}

/**
 * Get invoice by ID with ownership check ready
 */
export async function getInvoiceById(
  invoiceId: string,
): Promise<{ data: BillingInvoice } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('id', invoiceId)
    .is('archived_at', null)
    .single();

  if (error) {
    console.error('[getInvoiceById]', error);
    return { error: 'Invoice not found' };
  }

  return { data: data as BillingInvoice };
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(
  invoiceNumber: string,
): Promise<{ data: BillingInvoice } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .is('archived_at', null)
    .single();

  if (error) {
    return { error: 'Invoice not found' };
  }

  return { data: data as BillingInvoice };
}

/**
 * Get subscription usage for current period
 */
export async function getSubscriptionUsage(
  subscriptionId: string,
): Promise<{ data: SubscriptionUsage } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('business_id, current_period_start, current_period_end')
    .eq('id', subscriptionId)
    .is('archived_at', null)
    .single();

  if (subError) {
    return { error: 'Subscription not found' };
  }

  const businessId = subscription.business_id;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  // Query usage metrics
  const [productsResult, branchesResult, usersResult] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null),
    supabase
      .from('branches')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null),
    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null),
  ]);

  return {
    data: {
      subscription_id: subscriptionId,
      business_id: businessId,
      period_start: periodStart,
      period_end: periodEnd,
      products_count: productsResult.count || 0,
      branches_count: branchesResult.count || 0,
      team_members_count: usersResult.count || 0,
      api_calls_this_month: 0, // Would track from logs in real implementation
      storage_used_gb: 0, // Would track from file storage in real implementation
    },
  };
}

/**
 * Check if subscription by Stripe ID exists
 */
export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string,
): Promise<{ data: Subscription } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .is('archived_at', null)
    .single();

  if (error) {
    return { error: 'Subscription not found' };
  }

  return { data: data as Subscription };
}

/**
 * Get subscription with plan details
 */
export async function getSubscriptionWithPlan(subscriptionId: string): Promise<
  | {
      data: Subscription & { plan: SubscriptionPlan };
    }
  | { error: string }
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('id', subscriptionId)
    .is('archived_at', null)
    .single();

  if (error) {
    return { error: 'Subscription not found' };
  }

  return { data: data as SubscriptionWithUsageResponse };
}

/**
 * Get the primary business for a user (owner)
 * Used by subscription routes to get business_id from user
 */
export async function getUserBusiness(
  userId: string,
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .is('archived_at', null)
    .limit(1)
    .single();

  if (error) {
    return { error: 'Business not found for user' };
  }

  return { data };
}
