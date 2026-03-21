/**
 * Payment & Invoice Type Definitions
 * Stripe integration and payment processing
 *
 * NOTE: Domain types extend database.ts Row types as the foundation.
 * If database schema changes via migration, domain types automatically stay in sync.
 */

import { Database } from './database';

// Extract Row types from database.ts (source of truth)
type PaymentRow = Database['public']['Tables']['payments']['Row'];

// ===== Payment Status =====
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export type PaymentMethod = 'card' | 'bank_transfer' | 'wallet';

// ===== Payment Types - Extends PaymentRow with domain enrichments =====
export type Payment = PaymentRow & {
  user_id?: string; // Domain enrichment - not in DB
  stripe_payment_intent_id?: string | null;
  metadata?: {
    order_id?: string;
    subscription_id?: string;
    description?: string;
  };
  updated_at?: string; // Domain enrichment
  archived_at?: string | null; // Domain enrichment
};

export type CreatePaymentRequest = {
  amount: number;
  currency: 'PHP'; // Only PHP currency is supported
  payment_method: PaymentMethod;
  business_id?: string;
  metadata?: {
    order_id?: string;
    subscription_id?: string;
    description?: string;
  };
};

export type PaymentResponse = Payment;

export type PaymentHistoryFilters = {
  page?: number;
  per_page?: number;
  status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';
};

export type PaginatedPaymentsResponse = {
  payments: Payment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

// ===== Invoice Types =====
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'voided';

export type Invoice = {
  id: string;
  payment_id: string | null; // null if not yet paid
  user_id: string;
  business_id: string | null;
  amount: number; // in cents
  currency: 'PHP'; // Only PHP currency is supported
  status: InvoiceStatus;
  invoice_number: string; // auto-generated: INV-YYYYMMDD-XXXXX
  due_date: string | null;
  email_sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CreateInvoiceRequest = {
  payment_id?: string;
  amount: number;
  currency: 'PHP'; // Only PHP currency is supported
  due_date?: string;
  business_id?: string;
};

export type InvoiceResponse = Invoice;

export type InvoiceFilters = {
  page?: number;
  per_page?: number;
  status?: InvoiceStatus;
  start_date?: string;
  end_date?: string;
};

export type PaginatedInvoicesResponse = {
  invoices: Invoice[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

// ===== Stripe Types =====
export type StripeCheckoutSession = {
  id: string;
  url: string;
  client_secret?: string;
};

export type StripePaymentConfirm = {
  status: 'succeeded' | 'processing' | 'requires_action';
  client_secret?: string;
};

// ===== Checkout Request =====
export type CheckoutRequest = {
  amount: number;
  currency: 'PHP'; // Only PHP currency is supported
  payment_method: PaymentMethod;
  success_url: string;
  cancel_url: string;
  business_id?: string;
  metadata?: Record<string, unknown>;
};

// ===== Payment Analytics =====
export type PaymentAnalytics = {
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
  by_status: {
    succeeded: number;
    failed: number;
    pending: number;
  };
  by_payment_method: {
    card: number;
    bank_transfer: number;
    wallet: number;
  };
  by_currency: Record<string, number>;
};

// ===== Error Types =====
export type PaymentError =
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_ALREADY_PROCESSED'
  | 'STRIPE_ERROR'
  | 'INVALID_AMOUNT'
  | 'CURRENCY_NOT_SUPPORTED'
  | 'INVOICE_NOT_FOUND'
  | 'INVOICE_ALREADY_PAID'
  | 'EMAIL_SEND_FAILED';
