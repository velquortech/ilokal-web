/**
 * Payment & Invoice Validation Schemas
 * Using Zod for runtime type safety
 */

import { z } from 'zod';

// ===== Payment Schemas =====

export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
]);

export const paymentMethodSchema = z.enum(['card', 'bank_transfer', 'wallet']);

export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'INR',
  'ZAR',
]);

export const createPaymentSchema = z.object({
  amount: z
    .number()
    .min(1, 'Amount must be at least 1 cent')
    .max(999999999, 'Amount exceeds maximum'),
  currency: currencySchema,
  payment_method: paymentMethodSchema,
  business_id: z.string().uuid().optional(),
  metadata: z
    .object({
      order_id: z.string().optional(),
      subscription_id: z.string().optional(),
      description: z.string().max(500).optional(),
    })
    .optional(),
});

export const paymentFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  status: paymentStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  sort_by: z
    .enum(['newest', 'oldest', 'amount_asc', 'amount_desc'])
    .default('newest'),
});

export const checkoutRequestSchema = z.object({
  amount: z.number().min(1),
  currency: currencySchema,
  payment_method: paymentMethodSchema,
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  business_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ===== Invoice Schemas =====

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'voided']);

export const createInvoiceSchema = z.object({
  payment_id: z.string().uuid().optional(),
  amount: z.number().min(1),
  currency: currencySchema,
  due_date: z.string().datetime().optional(),
  business_id: z.string().uuid().optional(),
});

export const invoiceFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  status: invoiceStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const invoiceEmailSchema = z.object({
  recipient_email: z.string().email(),
});
