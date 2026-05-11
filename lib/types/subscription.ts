/**
 * Subscription domain types for subscription management and billing
 *
 * NOTE: Domain types extend database.ts Row types as the foundation.
 * If database schema changes via migration, domain types automatically stay in sync.
 */

import { Database } from './database';

// Extract Row types from database.ts (source of truth)
type SubscriptionRow =
  Database['public']['Tables']['business_subscriptions']['Row'];
type SubscriptionPlanRow =
  Database['public']['Tables']['subscription_plans']['Row'];

// Enums
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due';
export type PlanTier = 'basic' | 'professional' | 'enterprise';
export type FeatureType =
  | 'products'
  | 'branches'
  | 'users'
  | 'api_calls'
  | 'storage_gb'
  | 'custom_branding';
export type PaymentMethodType = 'card' | 'bank_transfer';

// Subscription Plan - Extends SubscriptionPlanRow with domain enrichments
export type SubscriptionPlan = SubscriptionPlanRow & {
  tier?: PlanTier;
  monthly_price_cents?: number; // Price in cents
  yearly_price_cents?: number;
  currency?: 'PHP'; // Only PHP currency is supported
  features: SubscriptionPlanFeature[];
  max_products?: number | null; // null = unlimited
  max_branches?: number | null;
  max_users?: number | null;
  max_api_calls_per_month?: number | null; // null = unlimited
  max_storage_gb?: number | null;
  custom_branding_enabled?: boolean;
  support_level?: 'email' | 'priority' | 'dedicated'; // Based on tier
  trial_days?: number; // 0 = no trial
  archived_at?: string | null;
};

export type SubscriptionPlanFeature = {
  id: string;
  plan_id: string;
  feature_type: FeatureType;
  limit: number | null; // null = unlimited
  description: string;
};

// User Subscription - Extends SubscriptionRow with domain enrichments (Stripe integration, auto-renew logic, etc.)
export type Subscription = SubscriptionRow & {
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  auto_renew?: boolean;
  trial_start?: string | null;
  trial_end?: string | null;
  next_billing_date?: string | null;
};

// Payment Methods (Stored locally + Stripe reference)
export type PaymentMethod = {
  id: string;
  business_id: string;
  type: PaymentMethodType;
  is_default: boolean;
  stripe_payment_method_id: string | null;
  // Card fields (only if type = 'card')
  card_last_four: string | null;
  card_brand: string | null; // visa, mastercard, amex, etc.
  card_exp_month: number | null;
  card_exp_year: number | null;
  // Bank transfer fields (only if type = 'bank_transfer')
  bank_account_last_four: string | null;
  bank_name: string | null;
  routing_number: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

// Subscription Usage/Metrics
export type SubscriptionUsage = {
  subscription_id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  products_count: number;
  branches_count: number;
  team_members_count: number;
  api_calls_this_month: number;
  storage_used_gb: number;
};

// Request/Response Types

export type CreateSubscriptionRequest = {
  plan_id: string;
  billing_cycle: BillingCycle;
  payment_method_id?: string;
};

export type UpdateSubscriptionRequest = {
  billing_cycle?: BillingCycle;
  payment_method_id?: string;
  auto_renew?: boolean;
};

export type UpgradeSubscriptionRequest = {
  new_plan_id: string;
  billing_cycle?: BillingCycle;
};

export type DowngradeSubscriptionRequest = {
  new_plan_id: string;
  downgrade_at?: 'immediately' | 'period_end'; // Default: period_end
};

export type CancelSubscriptionRequest = {
  cancel_at?: 'immediately' | 'period_end'; // Default: period_end
  feedback?: string; // Cancellation reason
};

export type CreatePaymentMethodRequest = {
  type: PaymentMethodType;
  is_default?: boolean;
  // Stripe token or payment method ID
  payment_method_id?: string; // From Stripe
  // Or card details (to tokenize)
  card_token?: string;
};

export type UpdatePaymentMethodRequest = {
  is_default?: boolean;
  exp_month?: number;
  exp_year?: number;
};

// Response Types
export type SubscriptionResponse = Subscription & {
  plan: SubscriptionPlan;
  payment_method?: PaymentMethod | null;
};

export type SubscriptionWithUsageResponse = Subscription & {
  plan: SubscriptionPlan;
  usage: SubscriptionUsage;
};

export type SubscriptionPlanListResponse = {
  plans: SubscriptionPlan[];
  count: number;
};

export type PaymentMethodListResponse = {
  payment_methods: PaymentMethod[];
  count: number;
  default_method_id: string | null;
};

export type BillingInvoice = {
  id: string;
  subscription_id: string;
  business_id: string;
  invoice_number: string; // INV-YYYYMMDD-XXXXX
  amount_cents: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'failed' | 'voided';
  billing_reason: 'subscription_cycle' | 'manual' | 'upgrade' | 'downgrade';
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type BillingInvoiceResponse = BillingInvoice & {
  subscription: Subscription;
};

export type BillingUsageResponse = {
  subscription: Subscription | null;
  usage: SubscriptionUsage;
  limits: {
    max_products: number | null;
    max_branches: number | null;
    max_users: number | null;
    max_api_calls_per_month: number | null;
    max_storage_gb: number | null;
  };
  usage_percentage: {
    products: number;
    branches: number;
    users: number;
    api_calls: number;
    storage: number;
  };
};

// Pagination helpers
export type PaginatedSubscriptionResponse = {
  data: SubscriptionResponse[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

export type PaginatedInvoiceResponse = {
  data: BillingInvoiceResponse[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

export type PaginatedPaymentMethodResponse = {
  data: PaymentMethod[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};
