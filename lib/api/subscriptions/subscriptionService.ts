/**
 * Subscription service layer - Business logic
 * Handles subscription management, upgrades, downgrades, payment methods, invoicing
 */

import { createServerSupabaseClient } from '@/config/server';
import type {
  ApiResponse,
  Subscription,
  SubscriptionResponse,
  SubscriptionPaymentMethod,
  BillingInvoice,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  UpgradeSubscriptionRequest,
  DowngradeSubscriptionRequest,
  CancelSubscriptionRequest,
  CreatePaymentMethodRequest,
} from '@/lib/types';
import * as subscriptionQuery from './subscriptionQuery';

/**
 * Create new subscription for business
 */
export async function createSubscription(
  businessId: string,
  input: CreateSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    // Verify business exists
    const businessResult = await supabase
      .from('profiles')
      .select('id')
      .eq('id', businessId)
      .eq('account_type', 'business')
      .is('archived_at', null)
      .single();

    if (businessResult.error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    // Verify plan exists
    const planResult = await subscriptionQuery.getSubscriptionPlanById(
      input.plan_id,
    );
    if ('error' in planResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription plan not found',
        },
      };
    }

    // Check if already has active subscription
    const activeResult =
      await subscriptionQuery.getActiveSubscription(businessId);
    if (!('error' in activeResult)) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Business already has active subscription',
        },
      };
    }

    // Calculate billing dates
    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(
      currentPeriodEnd.getMonth() +
        (input.billing_cycle === 'monthly' ? 1 : 12),
    );

    // Create subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          business_id: businessId,
          plan_id: input.plan_id,
          status: 'active',
          billing_cycle: input.billing_cycle,
          current_period_start: now.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          next_billing_date: currentPeriodEnd.toISOString(),
          payment_method_id: input.payment_method_id || null,
          auto_renew: true,
          cancel_at_period_end: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[createSubscription]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create subscription',
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        plan: planResult.data,
      } as SubscriptionResponse,
    };
  } catch (error) {
    console.error('[createSubscription]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create subscription',
      },
    };
  }
}

/**
 * Update subscription (billing cycle, payment method, auto-renew)
 */
export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const subResult =
      await subscriptionQuery.getSubscriptionById(subscriptionId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      };
    }

    const updates: Partial<Subscription> = {};

    if (input.billing_cycle) {
      updates.billing_cycle = input.billing_cycle;
    }

    if (input.payment_method_id) {
      // Verify payment method exists
      const pmResult = await subscriptionQuery.getPaymentMethodById(
        input.payment_method_id,
      );
      if ('error' in pmResult) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment method not found',
          },
        };
      }
      updates.payment_method_id = input.payment_method_id;
    }

    if (input.auto_renew !== undefined) {
      updates.auto_renew = input.auto_renew;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[updateSubscription]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update subscription',
        },
      };
    }

    const planResult = await subscriptionQuery.getSubscriptionPlanById(
      data.plan_id,
    );

    if ('error' in planResult) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan details',
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        plan: planResult.data,
      } as SubscriptionResponse,
    };
  } catch (error) {
    console.error('[updateSubscription]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update subscription',
      },
    };
  }
}

/**
 * Upgrade subscription to higher tier
 */
export async function upgradeSubscription(
  subscriptionId: string,
  input: UpgradeSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const subResult =
      await subscriptionQuery.getSubscriptionById(subscriptionId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      };
    }

    const newPlanResult = await subscriptionQuery.getSubscriptionPlanById(
      input.new_plan_id,
    );
    if ('error' in newPlanResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'New plan not found',
        },
      };
    }

    // TODO: Calculate proration credit if upgrading mid-cycle
    // For now, upgrade takes effect immediately

    const updates: Partial<Subscription> = {
      plan_id: input.new_plan_id,
      updated_at: new Date().toISOString(),
    };

    if (input.billing_cycle) {
      updates.billing_cycle = input.billing_cycle;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[upgradeSubscription]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upgrade subscription',
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        plan: newPlanResult.data,
      } as SubscriptionResponse,
    };
  } catch (error) {
    console.error('[upgradeSubscription]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upgrade subscription',
      },
    };
  }
}

/**
 * Downgrade subscription to lower tier
 */
export async function downgradeSubscription(
  subscriptionId: string,
  input: DowngradeSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const subResult =
      await subscriptionQuery.getSubscriptionById(subscriptionId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      };
    }

    const newPlanResult = await subscriptionQuery.getSubscriptionPlanById(
      input.new_plan_id,
    );
    if ('error' in newPlanResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'New plan not found',
        },
      };
    }

    // If downgrade_at = 'period_end', set flag instead of immediate change
    const updates: Partial<Subscription> = {
      updated_at: new Date().toISOString(),
    };

    if (input.downgrade_at === 'immediately') {
      updates.plan_id = input.new_plan_id;
    } else {
      // Store pending downgrade plan for processing at period end
      // TODO: Implement job to process pending downgrades at period_end
      // For MVP, we immediately downgrade
      updates.plan_id = input.new_plan_id;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[downgradeSubscription]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to downgrade subscription',
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        plan: newPlanResult.data,
      } as SubscriptionResponse,
    };
  } catch (error) {
    console.error('[downgradeSubscription]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to downgrade subscription',
      },
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  input: CancelSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const subResult =
      await subscriptionQuery.getSubscriptionById(subscriptionId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      };
    }

    const updates: Partial<Subscription> = {
      updated_at: new Date().toISOString(),
    };

    if (input.cancel_at === 'immediately') {
      updates.status = 'canceled';
      updates.canceled_at = new Date().toISOString();
    } else {
      // Cancel at period end
      updates.cancel_at_period_end = true;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      console.error('[cancelSubscription]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel subscription',
        },
      };
    }

    const planResult = await subscriptionQuery.getSubscriptionPlanById(
      data.plan_id,
    );

    if ('error' in planResult) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch plan details',
        },
      };
    }

    return {
      success: true,
      data: {
        ...data,
        plan: planResult.data,
      } as SubscriptionResponse,
    };
  } catch (error) {
    console.error('[cancelSubscription]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel subscription',
      },
    };
  }
}

/**
 * Add payment method for business
 */
export async function addPaymentMethod(
  businessId: string,
  input: CreatePaymentMethodRequest,
): Promise<ApiResponse<SubscriptionPaymentMethod>> {
  try {
    const supabase = await createServerSupabaseClient();
    // Verify business exists
    const businessCheck = await supabase
      .from('profiles')
      .select('id')
      .eq('id', businessId)
      .is('archived_at', null)
      .single();

    if (businessCheck.error) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    // If setting as default, unset other defaults
    if (input.is_default) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('business_id', businessId)
        .is('archived_at', null);
    }

    // TODO: In production, call Stripe API to create payment method token
    // Store the stripe_payment_method_id returned from Stripe

    const { data, error } = await supabase
      .from('payment_methods')
      .insert([
        {
          business_id: businessId,
          type: input.type,
          is_default: input.is_default || false,
          stripe_payment_method_id: input.payment_method_id || null,
          // Card fields would be populated from Stripe response
          // For MVP, these would be set during Stripe integration
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[addPaymentMethod]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add payment method',
        },
      };
    }

    return {
      success: true,
      data: data as SubscriptionPaymentMethod,
    };
  } catch (error) {
    console.error('[addPaymentMethod]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add payment method',
      },
    };
  }
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(
  paymentMethodId: string,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    // Soft delete
    const { error } = await supabase
      .from('payment_methods')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', paymentMethodId);

    if (error) {
      console.error('[removePaymentMethod]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove payment method',
        },
      };
    }

    return {
      success: true,
      data: { message: 'Payment method removed' },
    };
  } catch (error) {
    console.error('[removePaymentMethod]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove payment method',
      },
    };
  }
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  businessId: string,
  paymentMethodId: string,
): Promise<ApiResponse<SubscriptionPaymentMethod>> {
  try {
    const supabase = await createServerSupabaseClient();
    // Verify payment method belongs to business
    const pmResult =
      await subscriptionQuery.getPaymentMethodById(paymentMethodId);
    if ('error' in pmResult || pmResult.data.business_id !== businessId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found',
        },
      };
    }

    // Unset others
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('business_id', businessId)
      .is('archived_at', null);

    // Set this one
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .select()
      .single();

    if (error) {
      console.error('[setDefaultPaymentMethod]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to set default payment method',
        },
      };
    }

    return {
      success: true,
      data: data as SubscriptionPaymentMethod,
    };
  } catch (error) {
    console.error('[setDefaultPaymentMethod]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to set default payment method',
      },
    };
  }
}

/**
 * Generate invoice for payment (called on successful payment or manually by admin)
 */
export async function generateInvoice(
  subscriptionId: string,
): Promise<{ data: BillingInvoice } | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const subResult =
      await subscriptionQuery.getSubscriptionById(subscriptionId);
    if ('error' in subResult) {
      return { error: 'Subscription not found' };
    }

    const subscription = subResult.data;

    // Generate invoice number: INV-YYYYMMDD-XXXXX
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    const invoiceNumber = `INV-${dateStr}-${random}`;

    const { data, error } = await supabase
      .from('billing_invoices')
      .insert([
        {
          subscription_id: subscriptionId,
          business_id: subscription.business_id,
          invoice_number: invoiceNumber,
          // Amount would be from subscription plan in real implementation
          amount_cents: 0,
          currency: 'USD',
          status: 'draft',
          billing_reason: 'subscription_cycle',
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          due_date: subscription.next_billing_date,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[generateInvoice]', error);
      return { error: 'Failed to generate invoice' };
    }

    return { data: data as BillingInvoice };
  } catch (error) {
    console.error('[generateInvoice]', error);
    return { error: 'Failed to generate invoice' };
  }
}
