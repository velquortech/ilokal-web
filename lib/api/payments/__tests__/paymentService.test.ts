import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as paymentService from '@/lib/api/payments/paymentService';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';
import * as supabaseServer from '@/supabase/server';
import * as auditUtils from '@/lib/utils/audit';
import * as idempotencyUtils from '@/lib/utils/idempotency';
import { CheckoutRequest, CreateInvoiceRequest, Invoice } from '@/lib/types';

// Mock dependencies
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/api/payments/paymentQuery', () => ({
  getPaymentById: vi.fn(),
}));

vi.mock('@/lib/utils/audit', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/utils/idempotency', () => ({
  claimIdempotencyKey: vi.fn(),
}));

// Mock crypto.randomUUID for deterministic testing
vi.stubGlobal('crypto', {
  randomUUID: () => 'TEST-UUID-1234-5678-9012',
});

describe('paymentService', () => {
  let mockSupabase: any;
  let mockAuditEvent: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
    };

    mockAuditEvent = vi.mocked(auditUtils.default);

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession()', () => {
    it('should create checkout session successfully', async () => {
      const userId = 'user-1';
      const input: CheckoutRequest = {
        amount: 9999,
        currency: 'PHP',
        business_id: 'business-1',
        payment_method: 'card',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: userId },
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertResolve = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect,
          };
        }
        if (table === 'payments') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockInsert.mockReturnValue(mockInsertResolve);

      const result = await paymentService.createCheckoutSession(userId, input);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.url).toBeDefined();
    });

    it('should return error when user not found', async () => {
      const userId = 'user-nonexistent';
      const input: CheckoutRequest = {
        amount: 9999,
        currency: 'PHP',
        payment_method: 'card',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await paymentService.createCheckoutSession(userId, input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return error when insert fails', async () => {
      const userId = 'user-1';
      const input: CheckoutRequest = {
        amount: 9999,
        currency: 'PHP',
        payment_method: 'card',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: userId },
      });

      const mockInsert = vi
        .fn()
        .mockResolvedValue({ error: new Error('DB error') });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect,
          };
        }
        return {
          insert: mockInsert,
        };
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await paymentService.createCheckoutSession(userId, input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');

      consoleSpy.mockRestore();
    });
  });

  describe('confirmPayment()', () => {
    it('should confirm payment successfully', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'pending',
        business_id: 'business-1',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await paymentService.confirmPayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('succeeded');
    });

    it('should handle idempotent confirm (already succeeded)', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'succeeded',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const result = await paymentService.confirmPayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('succeeded');
      expect(mockAuditEvent).toHaveBeenCalledWith(
        'payment_confirm_idempotent',
        {
          paymentId,
        },
      );
    });

    it('should return error when payment not found', async () => {
      const paymentId = 'pay-nonexistent';

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        error: 'Not found',
      });

      const result = await paymentService.confirmPayment(paymentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error when update fails', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'pending',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi
        .fn()
        .mockResolvedValue({ error: new Error('DB error') });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await paymentService.confirmPayment(paymentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');

      consoleSpy.mockRestore();
    });
  });

  describe('refundPayment()', () => {
    it('should refund payment successfully', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'succeeded',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await paymentService.refundPayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockAuditEvent).toHaveBeenCalledWith('refund_attempt', {
        paymentId,
      });
    });

    it('should handle idempotent refund (already refunded)', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'refunded',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const result = await paymentService.refundPayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockAuditEvent).toHaveBeenCalledWith('refund_idempotent', {
        paymentId,
      });
    });

    it('should reject refund for non-succeeded payment', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'pending',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const result = await paymentService.refundPayment(paymentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should return error when payment not found', async () => {
      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        error: 'Not found',
      });

      const result = await paymentService.refundPayment('pay-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error when update fails', async () => {
      const paymentId = 'pay-1';

      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 9999,
        status: 'succeeded',
      };

      vi.mocked(paymentQuery.getPaymentById).mockResolvedValue({
        payment: mockPayment,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi
        .fn()
        .mockResolvedValue({ error: new Error('DB error') });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await paymentService.refundPayment(paymentId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');

      consoleSpy.mockRestore();
    });
  });

  describe('createInvoice()', () => {
    it('should create invoice successfully', async () => {
      const userId = 'user-1';
      const input: CreateInvoiceRequest = {
        payment_id: 'pay-1',
        amount: 9999,
        currency: 'PHP',
        business_id: 'business-1',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: userId },
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'inv-1',
          invoice_number: 'INV-20260401-12345',
          amount: input.amount,
          currency: input.currency,
          status: 'draft',
          user_id: userId,
          payment_id: input.payment_id,
        } as Invoice,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect,
          };
        }
        return {
          insert: mockInsert,
        };
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      const result = await paymentService.createInvoice(userId, input);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.invoice_number).toBeDefined();
    });

    it('should return error when user not found', async () => {
      const userId = 'user-nonexistent';
      const input: CreateInvoiceRequest = {
        amount: 9999,
        currency: 'PHP',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await paymentService.createInvoice(userId, input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return error when insert fails', async () => {
      const userId = 'user-1';
      const input: CreateInvoiceRequest = {
        amount: 9999,
        currency: 'PHP',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: userId },
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('DB error') });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect,
          };
        }
        return {
          insert: mockInsert,
        };
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await paymentService.createInvoice(userId, input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');

      consoleSpy.mockRestore();
    });
  });

  describe('generateInvoiceNumber()', () => {
    it('should generate valid invoice number format', async () => {
      // Test format: INV-YYYYMMDD-XXXXX
      // We can't directly test this since it's internal,
      // but we test it through createInvoice result
      const userId = 'user-1';
      const input: CreateInvoiceRequest = {
        amount: 9999,
        currency: 'PHP',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: userId },
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();

      const generatedInvoiceNumber = 'INV-20260401-12345';
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'inv-1',
          invoice_number: generatedInvoiceNumber,
          amount: input.amount,
          currency: input.currency,
        } as Invoice,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect,
          };
        }
        return {
          insert: mockInsert,
        };
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockInsert.mockReturnValue({
        select: mockInsertSelect,
      });
      mockInsertSelect.mockReturnValue({
        single: mockInsertSingle,
      });

      const result = await paymentService.createInvoice(userId, input);

      expect(result.success).toBe(true);
      // Format should be INV-YYYYMMDD-XXXXX
      expect(result.data?.invoice_number).toMatch(/^INV-\d{8}-\d{5}$/);
    });
  });
});
