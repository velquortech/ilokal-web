import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';
import * as supabaseServer from '@/supabase/server';
import { PaymentHistoryFilters, InvoiceFilters } from '@/lib/types';

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('paymentQuery', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
    };

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPaymentHistory()', () => {
    it('should return paginated payments for user', async () => {
      const userId = 'user-1';
      const filters: PaymentHistoryFilters = {
        page: 1,
        per_page: 20,
      };

      const mockPayments = [
        {
          id: 'pay-1',
          user_id: userId,
          amount: 5000,
          status: 'succeeded',
          created_at: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          user_id: userId,
          amount: 3000,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockPayments,
        count: 2,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await paymentQuery.getPaymentHistory(userId, filters);

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.per_page).toBe(20);
    });

    it('should filter by status', async () => {
      const userId = 'user-1';
      const filters: PaymentHistoryFilters = {
        page: 1,
        per_page: 20,
        status: 'succeeded',
      };

      const mockPayments = [
        {
          id: 'pay-1',
          user_id: userId,
          status: 'succeeded',
          amount: 5000,
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockPayments,
        count: 1,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        eq: mockEq2,
      });
      mockEq2.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await paymentQuery.getPaymentHistory(userId, filters);

      expect(result.payments).toHaveLength(1);
      expect(mockEq2).toHaveBeenCalledWith('status', 'succeeded');
    });

    it('should handle date range filters', async () => {
      const userId = 'user-1';
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-12-31T23:59:59Z';
      const filters: PaymentHistoryFilters = {
        page: 1,
        per_page: 20,
        start_date: startDate,
        end_date: endDate,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      await paymentQuery.getPaymentHistory(userId, filters);

      expect(mockGte).toHaveBeenCalledWith('created_at', startDate);
      expect(mockLte).toHaveBeenCalledWith('created_at', endDate);
    });

    it('should handle sorting options', async () => {
      const userId = 'user-1';
      const filters: PaymentHistoryFilters = {
        page: 1,
        per_page: 20,
        sort_by: 'amount_desc',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      await paymentQuery.getPaymentHistory(userId, filters);

      expect(mockOrder).toHaveBeenCalledWith('amount', { ascending: false });
    });

    it('should handle database error', async () => {
      const userId = 'user-1';
      const filters: PaymentHistoryFilters = {
        page: 1,
        per_page: 20,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        count: null,
        error: new Error('DB error'),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await paymentQuery.getPaymentHistory(userId, filters);

      expect(result.payments).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.error).toBe('Failed to fetch payments');

      consoleSpy.mockRestore();
    });

    it('should calculate pagination correctly', async () => {
      const userId = 'user-1';
      const filters: PaymentHistoryFilters = {
        page: 2,
        per_page: 10,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi
        .fn()
        .mockResolvedValue({ data: [], count: 25, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await paymentQuery.getPaymentHistory(userId, filters);

      expect(result.page).toBe(2);
      expect(result.per_page).toBe(10);
      expect(result.total).toBe(25);
      expect(result.total_pages).toBe(3);
      expect(mockRange).toHaveBeenCalledWith(10, 19); // offset and limit for page 2
    });
  });

  describe('getPaymentById()', () => {
    it('should retrieve payment by ID', async () => {
      const paymentId = 'pay-1';
      const mockPayment = {
        id: paymentId,
        user_id: 'user-1',
        amount: 5000,
        status: 'succeeded',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: mockPayment, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await paymentQuery.getPaymentById(paymentId);

      expect(result).toHaveProperty('payment');
      expect(result.payment.id).toBe(paymentId);
    });

    it('should handle payment not found', async () => {
      const paymentId = 'pay-nonexistent';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Not found') });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await paymentQuery.getPaymentById(paymentId);

      expect(result).toHaveProperty('error');
    });
  });

  describe('paymentExists()', () => {
    it('should return true when payment exists', async () => {
      const paymentId = 'pay-1';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 1,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await paymentQuery.paymentExists(paymentId);

      expect(result).toBe(true);
    });

    it('should return false when payment does not exist', async () => {
      const paymentId = 'pay-nonexistent';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 0,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await paymentQuery.paymentExists(paymentId);

      expect(result).toBe(false);
    });
  });

  describe('getPaymentAnalytics()', () => {
    it('should retrieve payment analytics for 7 day period', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          status: 'succeeded',
          amount: 5000,
          payment_method: 'card',
          currency: 'PHP',
          created_at: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          status: 'succeeded',
          amount: 3000,
          payment_method: 'card',
          currency: 'PHP',
          created_at: new Date().toISOString(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi
        .fn()
        .mockResolvedValue({ data: mockPayments, error: null });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        gte: mockGte,
      });

      const result = await paymentQuery.getPaymentAnalytics('7d');

      expect(result).toHaveProperty('analytics');
      expect(result.analytics).toBeDefined();
    });

    it('should handle analytics query error', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockGte = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('DB error') });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        gte: mockGte,
      });

      const result = await paymentQuery.getPaymentAnalytics('30d');

      expect(result).toHaveProperty('error');
    });
  });
});
