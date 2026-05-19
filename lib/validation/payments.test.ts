/**
 * Payment Validation Schemas Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  createPaymentSchema,
  paymentStatusSchema,
  paymentMethodSchema,
  currencySchema,
  paymentFiltersSchema,
  createInvoiceSchema,
  checkoutRequestSchema,
} from './payments';

describe('Payment Validation Schemas', () => {
  describe('currencySchema - PHP Only Enforcement', () => {
    it('should accept PHP currency', () => {
      const result = currencySchema.safeParse('PHP');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('PHP');
      }
    });

    it('should reject non-PHP currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'INR', 'ZAR', 'JPY'];
      currencies.forEach((curr) => {
        const result = currencySchema.safeParse(curr);
        expect(result.success).toBe(false);
      });
    });

    it('should reject empty string', () => {
      const result = currencySchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = currencySchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe('paymentStatusSchema', () => {
    it('should accept valid payment statuses', () => {
      const validStatuses = [
        'pending',
        'processing',
        'succeeded',
        'failed',
        'canceled',
      ];
      validStatuses.forEach((status) => {
        const result = paymentStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid statuses', () => {
      const result = paymentStatusSchema.safeParse('completed');
      expect(result.success).toBe(false);
    });
  });

  describe('paymentMethodSchema', () => {
    it('should accept valid payment methods', () => {
      const validMethods = ['card', 'bank_transfer', 'wallet'];
      validMethods.forEach((method) => {
        const result = paymentMethodSchema.safeParse(method);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid payment methods', () => {
      const result = paymentMethodSchema.safeParse('crypto');
      expect(result.success).toBe(false);
    });
  });

  describe('createPaymentSchema', () => {
    const validPayment = {
      amount: 10000,
      currency: 'PHP',
      payment_method: 'card',
    };

    it('should accept valid payment', () => {
      const result = createPaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should accept payment with business_id', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        business_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept payment with metadata', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        metadata: {
          order_id: 'ORD-123',
          description: 'Product purchase',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject amount less than 1', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject amount exceeding max', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        amount: 1000000000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-PHP currency', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        payment_method: 'check',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid business_id UUID', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        business_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject metadata with description exceeding 500 chars', () => {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        metadata: {
          description: 'a'.repeat(501),
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paymentFiltersSchema', () => {
    it('should accept default filters', () => {
      const result = paymentFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.per_page).toBe(20);
        expect(result.data.sort_by).toBe('newest');
      }
    });

    it('should accept valid pagination', () => {
      const result = paymentFiltersSchema.safeParse({
        page: 2,
        per_page: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject page less than 1', () => {
      const result = paymentFiltersSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject per_page exceeding max of 100', () => {
      const result = paymentFiltersSchema.safeParse({
        per_page: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid filters with dates', () => {
      const result = paymentFiltersSchema.safeParse({
        status: 'succeeded',
        start_date: '2026-03-01T00:00:00Z',
        end_date: '2026-03-31T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid sort options', () => {
      const sortOptions = ['newest', 'oldest', 'amount_asc', 'amount_desc'];
      sortOptions.forEach((sort) => {
        const result = paymentFiltersSchema.safeParse({ sort_by: sort });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createInvoiceSchema', () => {
    const validInvoice = {
      amount: 10000,
      currency: 'PHP',
    };

    it('should accept valid invoice', () => {
      const result = createInvoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('should accept invoice with payment_id', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        payment_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept invoice with due_date', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        due_date: '2026-04-21T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-PHP currency', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid amount', () => {
      const result = createInvoiceSchema.safeParse({
        ...validInvoice,
        amount: -1000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('checkoutRequestSchema', () => {
    const validCheckout = {
      amount: 10000,
      currency: 'PHP',
      payment_method: 'card',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    };

    it('should accept valid checkout request', () => {
      const result = checkoutRequestSchema.safeParse(validCheckout);
      expect(result.success).toBe(true);
    });

    it('should accept checkout with metadata', () => {
      const result = checkoutRequestSchema.safeParse({
        ...validCheckout,
        metadata: {
          order_id: 'ORD-123',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-PHP currency', () => {
      const result = checkoutRequestSchema.safeParse({
        ...validCheckout,
        currency: 'USD',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URLs', () => {
      const result = checkoutRequestSchema.safeParse({
        ...validCheckout,
        success_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });
});
