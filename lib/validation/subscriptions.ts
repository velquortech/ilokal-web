/**
 * Subscription validation schemas using Zod
 */

import { z } from 'zod';

// Billing cycle validation
export const billingCycleSchema = z.enum(['monthly', 'yearly']);

// Subscription status validation
export const subscriptionStatusSchema = z.enum([
  'active',
  'canceled',
  'expired',
  'past_due',
]);

// Plan tier validation
export const planTierSchema = z.enum(['basic', 'professional', 'enterprise']);

// Payment method type validation
export const paymentMethodTypeSchema = z.enum(['card', 'bank_transfer']);

// Feature type validation
export const featureTypeSchema = z.enum([
  'products',
  'branches',
  'users',
  'api_calls',
  'storage_gb',
  'custom_branding',
]);

// Currency validation (same as payment)
export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'INR',
  'ZAR',
]);

/**
 * Create subscription schema
 * Validates business owner subscribing to a plan
 */
export const createSubscriptionSchema = z.object({
  plan_id: z
    .string()
    .uuid('Invalid plan ID')
    .describe('UUID of the subscription plan'),
  billing_cycle: billingCycleSchema.describe('Monthly or yearly billing'),
  payment_method_id: z
    .string()
    .uuid()
    .optional()
    .describe('Optional: pre-existing payment method ID'),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

/**
 * Update subscription schema
 * For changing billing cycle or payment method without changing plan
 */
export const updateSubscriptionSchema = z.object({
  billing_cycle: billingCycleSchema
    .optional()
    .describe('Switch between monthly/yearly'),
  payment_method_id: z
    .string()
    .uuid()
    .optional()
    .describe('Update payment method'),
  auto_renew: z.boolean().optional().describe('Enable/disable auto-renewal'),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

/**
 * Upgrade subscription schema
 * For moving to a higher tier plan
 */
export const upgradeSubscriptionSchema = z.object({
  new_plan_id: z
    .string()
    .uuid('Invalid plan ID')
    .describe('UUID of new higher-tier plan'),
  billing_cycle: billingCycleSchema
    .optional()
    .describe('Optionally change billing cycle on upgrade'),
});

export type UpgradeSubscriptionInput = z.infer<
  typeof upgradeSubscriptionSchema
>;

/**
 * Downgrade subscription schema
 * For moving to a lower tier plan
 */
export const downgradeSubscriptionSchema = z.object({
  new_plan_id: z
    .string()
    .uuid('Invalid plan ID')
    .describe('UUID of new lower-tier plan'),
  downgrade_at: z
    .enum(['immediately', 'period_end'])
    .default('period_end')
    .optional()
    .describe('When to apply downgrade (default: at period end)'),
});

export type DowngradeSubscriptionInput = z.infer<
  typeof downgradeSubscriptionSchema
>;

/**
 * Cancel subscription schema
 * For canceling active subscription
 */
export const cancelSubscriptionSchema = z.object({
  cancel_at: z
    .enum(['immediately', 'period_end'])
    .default('period_end')
    .optional()
    .describe('When to cancel (default: at period end)'),
  feedback: z
    .string()
    .max(500)
    .optional()
    .describe('Cancellation reason/feedback'),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

/**
 * Create payment method schema
 * For adding card or bank account for billing
 */
export const createPaymentMethodSchema = z.object({
  type: paymentMethodTypeSchema.describe('card or bank_transfer'),
  is_default: z
    .boolean()
    .default(false)
    .optional()
    .describe('Set as default payment method'),
  payment_method_id: z
    .string()
    .optional()
    .describe('Stripe payment method ID (from token)'),
  card_token: z.string().optional().describe('Card token from Stripe'),
});

export type CreatePaymentMethodInput = z.infer<
  typeof createPaymentMethodSchema
>;

/**
 * Update payment method schema
 * For updating existing payment method details
 */
export const updatePaymentMethodSchema = z.object({
  is_default: z.boolean().optional().describe('Set as default payment method'),
  exp_month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Card expiration month (1-12)'),
  exp_year: z
    .number()
    .int()
    .min(2025)
    .max(2099)
    .optional()
    .describe('Card expiration year'),
});

export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;

/**
 * Subscription filters schema
 * For listing and filtering user subscriptions
 */
export const subscriptionFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(10),
  status: subscriptionStatusSchema
    .optional()
    .describe('Filter by subscription status'),
  plan_tier: planTierSchema.optional().describe('Filter by plan tier'),
  billing_cycle: billingCycleSchema
    .optional()
    .describe('Filter by billing cycle'),
});

export type SubscriptionFiltersInput = z.infer<
  typeof subscriptionFiltersSchema
>;

/**
 * Invoice filters schema
 * For listing and filtering billing invoices
 */
export const invoiceFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(10),
  status: z
    .enum(['draft', 'sent', 'paid', 'failed', 'voided'])
    .optional()
    .describe('Filter by invoice status'),
  start_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter invoices from date'),
  end_date: z
    .string()
    .datetime()
    .optional()
    .describe('Filter invoices until date'),
  sort_by: z
    .enum(['newest', 'oldest', 'amount_asc', 'amount_desc'])
    .default('newest')
    .optional(),
});

export type InvoiceFiltersInput = z.infer<typeof invoiceFiltersSchema>;

/**
 * Payment method filters schema
 * For listing payment methods
 */
export const paymentMethodFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
  type: paymentMethodTypeSchema
    .optional()
    .describe('Filter by payment method type'),
});

export type PaymentMethodFiltersInput = z.infer<
  typeof paymentMethodFiltersSchema
>;

/**
 * Subscription plan validation (for admin POST/PUT)
 */
export const createSubscriptionPlanSchema = z.object({
  tier: planTierSchema,
  name: z.string().min(2).max(50).describe('Plan name (e.g., "Professional")'),
  description: z.string().max(500).describe('Plan description'),
  monthly_price_cents: z
    .number()
    .int()
    .min(0)
    .max(999999999)
    .describe('Monthly price in cents'),
  yearly_price_cents: z
    .number()
    .int()
    .min(0)
    .max(999999999)
    .describe('Yearly price in cents'),
  currency: currencySchema,
  max_products: z
    .number()
    .int()
    .min(1)
    .nullable()
    .describe('Maximum products (null = unlimited)'),
  max_branches: z.number().int().min(1).nullable().describe('Maximum branches'),
  max_users: z
    .number()
    .int()
    .min(1)
    .nullable()
    .describe('Maximum team members'),
  max_api_calls_per_month: z
    .number()
    .int()
    .min(100)
    .nullable()
    .describe('API call limit per month'),
  max_storage_gb: z.number().int().min(1).nullable().describe('Storage in GB'),
  custom_branding_enabled: z
    .boolean()
    .default(false)
    .describe('Enable custom branding'),
  support_level: z
    .enum(['email', 'priority', 'dedicated'])
    .describe('Support level'),
  trial_days: z
    .number()
    .int()
    .min(0)
    .max(90)
    .default(0)
    .describe('Free trial days'),
});

export type CreateSubscriptionPlanInput = z.infer<
  typeof createSubscriptionPlanSchema
>;
