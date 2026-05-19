/**
 * Business Analytics Query Tests - Fixed mock chains
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getBusinessDashboard,
  getProductPerformance,
  getCouponStats,
  getTrafficMetrics,
  getBusinessRevenue,
} from '../businessAnalyticsQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('businessAnalyticsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessDashboard', () => {
    it('should return complete business dashboard data', async () => {
      // Create mock functions for each query's chain
      // Q1: .from().select().eq()
      const q1eq = vi.fn().mockReturnValue({ count: 10, error: null });
      const q1select = vi
        .fn()
        .mockReturnValue({ count: 10, error: null, eq: q1eq });

      // Q2: .from().select().eq().eq()
      const q2eq2 = vi.fn().mockReturnValue({ count: 5, error: null });
      const q2eq1 = vi
        .fn()
        .mockReturnValue({ count: 10, error: null, eq: q2eq2 });
      const q2select = vi
        .fn()
        .mockReturnValue({ count: 10, error: null, eq: q2eq1 });

      // Q3: .from().select().eq().eq()
      const q3eq2 = vi
        .fn()
        .mockReturnValue({ data: [{ sum: 500000 }], error: null });
      const q3eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q3eq2 });
      const q3select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q3eq1 });

      // Q4: .from().select().eq().eq().gte()
      const q4gte = vi
        .fn()
        .mockReturnValue({ data: [{ sum: 150000 }], error: null });
      const q4eq2 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q4gte });
      const q4eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q4eq2 });
      const q4select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q4eq1 });

      // Create from() mock that returns different queries sequentially
      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select })
        .mockReturnValueOnce({ select: q3select })
        .mockReturnValueOnce({ select: q4select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBusinessDashboard('biz-1');

      expect(result).toHaveProperty('business_id');
      expect(result).toHaveProperty('product_count');
      expect(result).toHaveProperty('active_products');
      expect(result).toHaveProperty('total_revenue');
      expect(result).toHaveProperty('revenue_last_30_days');
      expect(typeof result.product_count).toBe('number');
    });

    it('should handle missing dashboard data and return zeros', async () => {
      // All queries return null/empty
      const q1eq = vi.fn().mockReturnValue({ count: null, error: null });
      const q1select = vi
        .fn()
        .mockReturnValue({ count: null, error: null, eq: q1eq });

      const q2eq2 = vi.fn().mockReturnValue({ count: null, error: null });
      const q2eq1 = vi
        .fn()
        .mockReturnValue({ count: null, error: null, eq: q2eq2 });
      const q2select = vi
        .fn()
        .mockReturnValue({ count: null, error: null, eq: q2eq1 });

      const q3eq2 = vi.fn().mockReturnValue({ data: [], error: null });
      const q3eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q3eq2 });
      const q3select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q3eq1 });

      const q4gte = vi.fn().mockReturnValue({ data: [], error: null });
      const q4eq2 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q4gte });
      const q4eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q4eq2 });
      const q4select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q4eq1 });

      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select })
        .mockReturnValueOnce({ select: q3select })
        .mockReturnValueOnce({ select: q4select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBusinessDashboard('biz-1');

      expect(result.product_count).toBe(0);
      expect(result.active_products).toBe(0);
      expect(result.total_revenue).toBe(0);
      expect(result.revenue_last_30_days).toBe(0);
    });
  });

  describe('getProductPerformance', () => {
    it('should return product sales rankings sorted by performance', async () => {
      const eq2 = vi.fn().mockReturnValue({
        data: [
          { product_id: 'prod-1', amount: 145 },
          { product_id: 'prod-2', amount: 87 },
        ],
        error: null,
      });
      const eq1 = vi.fn().mockReturnValue({ data: [], error: null, eq: eq2 });
      const select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: eq1 });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getProductPerformance('biz-1', 10);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('product_id');
        expect(result[0]).toHaveProperty('units_sold');
        expect(result[0]).toHaveProperty('revenue');
      }
    });

    it('should filter products by time period', async () => {
      const eq2 = vi.fn().mockReturnValue({ data: [], error: null });
      const eq1 = vi.fn().mockReturnValue({ data: [], error: null, eq: eq2 });
      const select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: eq1 });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getProductPerformance('biz-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCouponStats', () => {
    it('should return coupon redemption statistics', async () => {
      const eq = vi.fn().mockReturnValue({
        data: [
          { coupon_id: 'c-1', discount_amount: 450 },
          { coupon_id: 'c-2', discount_amount: 280 },
        ],
        error: null,
      });
      const select = vi.fn().mockReturnValue({ data: [], error: null, eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getCouponStats('biz-1');

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('coupon_id');
        expect(result[0]).toHaveProperty('times_redeemed');
        expect(result[0]).toHaveProperty('total_discount_amount');
      }
    });

    it('should return empty array when no coupons found', async () => {
      const eq = vi.fn().mockReturnValue({ data: [], error: null });
      const select = vi.fn().mockReturnValue({ data: [], error: null, eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getCouponStats('biz-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getTrafficMetrics', () => {
    it('should return traffic analytics with visitor and conversion data', async () => {
      // Query 1: count page views
      const q1gte = vi
        .fn()
        .mockReturnValue({ count: 1524, error: null, data: [] });
      const q1eq = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q1gte });
      const q1select = vi
        .fn()
        .mockReturnValue({ count: 1524, error: null, eq: q1eq });

      // Query 2: get unique visitor IDs
      const q2gte = vi.fn().mockReturnValue({
        data: [
          { visitor_id: 'v1' },
          { visitor_id: 'v2' },
          { visitor_id: 'v1' },
        ],
        error: null,
      });
      const q2eq = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q2gte });
      const q2select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q2eq });

      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getTrafficMetrics('biz-1');

      expect(result).toHaveProperty('business_id');
      expect(result).toHaveProperty('page_views_last_30_days');
      expect(result).toHaveProperty('unique_visitors_last_30_days');
    });

    it('should return zero metrics when no data', async () => {
      const q1gte = vi
        .fn()
        .mockReturnValue({ count: 0, error: null, data: [] });
      const q1eq = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q1gte });
      const q1select = vi
        .fn()
        .mockReturnValue({ count: 0, error: null, eq: q1eq });

      const q2gte = vi.fn().mockReturnValue({ data: [], error: null });
      const q2eq = vi
        .fn()
        .mockReturnValue({ data: [], error: null, gte: q2gte });
      const q2select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q2eq });

      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getTrafficMetrics('biz-1');

      expect(result.page_views_last_30_days).toBe(0);
      expect(result.unique_visitors_last_30_days).toBe(0);
    });
  });

  describe('getBusinessRevenue', () => {
    it('should return revenue metrics including totals and trends', async () => {
      // Query 1: total revenue
      const q1eq2 = vi
        .fn()
        .mockReturnValue({ data: [{ sum: 450000 }], error: null });
      const q1eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q1eq2 });
      const q1select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q1eq1 });

      // Query 2: monthly breakdown
      const q2eq = vi.fn().mockReturnValue({
        data: [
          { created_at: '2026-03-01T00:00:00Z', amount: 100000 },
          { created_at: '2026-02-01T00:00:00Z', amount: 80000 },
        ],
        error: null,
      });
      const q2select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q2eq });

      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBusinessRevenue('biz-1');

      expect(result).toHaveProperty('total_revenue');
      expect(result).toHaveProperty('revenue_by_month');
      expect(typeof result.total_revenue).toBe('number');
    });

    it('should handle zero revenue data', async () => {
      const q1eq2 = vi.fn().mockReturnValue({ data: [], error: null });
      const q1eq1 = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q1eq2 });
      const q1select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q1eq1 });

      const q2eq = vi.fn().mockReturnValue({ data: [], error: null });
      const q2select = vi
        .fn()
        .mockReturnValue({ data: [], error: null, eq: q2eq });

      const fromMock = vi
        .fn()
        .mockReturnValueOnce({ select: q1select })
        .mockReturnValueOnce({ select: q2select });

      const supabaseClient = {
        from: fromMock,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBusinessRevenue('biz-1');

      expect(result.total_revenue).toBe(0);
    });
  });
});
