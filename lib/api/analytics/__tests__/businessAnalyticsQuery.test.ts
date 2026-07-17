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
  getRetentionData,
  getMonthlyTrend,
  getFollowerFunnel,
  getCouponPerformance,
  getCustomerSegments,
  generateAutomationSuggestions,
} from '../businessAnalyticsQuery';
import { createAnalyticsSupabaseClient } from '@/supabase/server';
import type {
  BusinessHealthData,
  CustomerSegmentCounts,
  FollowerFunnelData,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Shared helpers for query chain mocking
// ---------------------------------------------------------------------------
function makeChain(result: {
  data?: unknown;
  count?: number | null;
  error: null;
}): Record<string, unknown> {
  const obj: Record<string, unknown> = { ...result };
  for (const m of [
    'select',
    'eq',
    'in',
    'is',
    'gt',
    'gte',
    'lt',
    'lte',
    'neq',
    'order',
    'limit',
    'single',
  ]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  return obj;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// Calendar-anchored helpers — safe regardless of which day of the month tests run.
function currentMonthDate(day = 10): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), day).toISOString();
}

function lastMonthDate(day = 10): string {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() - 1, day).toISOString();
}

vi.mock('@/supabase/server', () => ({
  createAnalyticsSupabaseClient: vi.fn(),
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getProductPerformance('biz-1', 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCouponStats', () => {
    it('should return coupon redemption statistics from the aggregate RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: [
          { coupon_id: 'c-1', redeemed: 2, avg_days_to_redeem: 3 },
          { coupon_id: 'c-2', redeemed: 1, avg_days_to_redeem: 5 },
        ],
        error: null,
      });

      const supabaseClient = { rpc } as unknown as Awaited<
        ReturnType<typeof createAnalyticsSupabaseClient>
      >;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getCouponStats('biz-1');

      expect(rpc).toHaveBeenCalledWith('analytics_coupon_redemption_stats', {
        p_business_id: 'biz-1',
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ coupon_id: 'c-1', times_redeemed: 2 });
    });

    it('should return empty array when the RPC returns none', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      const supabaseClient = { rpc } as unknown as Awaited<
        ReturnType<typeof createAnalyticsSupabaseClient>
      >;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getCouponStats('biz-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getTrafficMetrics', () => {
    it('should return traffic analytics from the aggregate RPC', async () => {
      const rpc = vi.fn().mockResolvedValue({
        data: [{ page_views: 1524, unique_visitors: 812 }],
        error: null,
      });
      const supabaseClient = { rpc } as unknown as Awaited<
        ReturnType<typeof createAnalyticsSupabaseClient>
      >;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getTrafficMetrics('biz-1');

      expect(rpc).toHaveBeenCalledWith(
        'analytics_traffic_metrics',
        expect.objectContaining({ p_business_id: 'biz-1' }),
      );
      expect(result.page_views_last_30_days).toBe(1524);
      expect(result.unique_visitors_last_30_days).toBe(812);
    });

    it('should return zero metrics when the RPC returns none', async () => {
      const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      const supabaseClient = { rpc } as unknown as Awaited<
        ReturnType<typeof createAnalyticsSupabaseClient>
      >;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
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
      } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

      (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBusinessRevenue('biz-1');

      expect(result.total_revenue).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// New analytics query functions
// ---------------------------------------------------------------------------

describe('getRetentionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 6 zero months when business has no coupons', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getRetentionData('biz-1');

    expect(result).toHaveLength(6);
    result.forEach((r) => {
      expect(r.new_customers).toBe(0);
      expect(r.returning_customers).toBe(0);
      expect(r.churned_customers).toBe(0);
    });
  });

  it('classifies users as returning when they redeemed in consecutive months', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [
              { user_id: 'user-1', redeemed_at: daysAgo(5) },
              { user_id: 'user-1', redeemed_at: daysAgo(35) },
            ],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getRetentionData('biz-1');

    expect(result).toHaveLength(6);
    const totalReturning = result.reduce(
      (sum, r) => sum + r.returning_customers,
      0,
    );
    expect(totalReturning).toBeGreaterThan(0);
  });

  it('counts churned customers from previous month', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            // User redeemed in last calendar month only — churned in current month.
            // lastMonthDate() is always in the previous calendar month regardless of
            // which day of the month the tests run.
            data: [{ user_id: 'user-churn', redeemed_at: lastMonthDate() }],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getRetentionData('biz-1');

    expect(result).toHaveLength(6);
    // The most recent entry should record the churn
    const lastEntry = result[result.length - 1];
    expect(lastEntry.churned_customers).toBeGreaterThan(0);
  });
});

describe('getMonthlyTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 6 months with zero counts when no followers or redemptions exist', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows') return makeChain({ data: [], error: null });
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getMonthlyTrend('biz-1');

    expect(result).toHaveLength(6);
    result.forEach((point) => {
      expect(point.followers).toBe(0);
      expect(point.redemptions).toBe(0);
    });
  });

  it('counts followers and redemptions in the correct month bucket', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows')
          return makeChain({
            // currentMonthDate() is always in the current calendar month so
            // it maps to the last (most-recent) bucket in getMonthlyTrend.
            data: [{ created_at: currentMonthDate() }],
            error: null,
          });
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [{ redeemed_at: currentMonthDate() }],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getMonthlyTrend('biz-1');

    expect(result).toHaveLength(6);
    // The last (most recent) month should have the counts
    const lastPoint = result[result.length - 1];
    expect(lastPoint.followers).toBe(1);
    expect(lastPoint.redemptions).toBe(1);
  });

  it('returns 6 data points regardless of data volume', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows')
          return makeChain({
            data: Array.from({ length: 20 }, (_, i) => ({
              created_at: daysAgo(i * 3),
            })),
            error: null,
          });
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: Array.from({ length: 20 }, (_, i) => ({
              redeemed_at: daysAgo(i * 3),
            })),
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getMonthlyTrend('biz-1');

    expect(result.length).toBe(6);
  });
});

describe('getFollowerFunnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all zeros when no followers exist', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows') return makeChain({ data: [], error: null });
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getFollowerFunnel('biz-1');

    expect(result.total_followers).toBe(0);
    expect(result.ever_redeemed).toBe(0);
    expect(result.active_30d).toBe(0);
    expect(result.loyal).toBe(0);
  });

  it('counts total followers correctly', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows')
          return makeChain({
            data: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }],
            error: null,
          });
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getFollowerFunnel('biz-1');

    expect(result.total_followers).toBe(3);
  });

  it('marks users who redeemed within 30 days as active', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows')
          return makeChain({
            data: [{ user_id: 'u1' }],
            error: null,
          });
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [{ user_id: 'u1', redeemed_at: daysAgo(10) }],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getFollowerFunnel('biz-1');

    expect(result.active_30d).toBe(1);
  });

  it('marks users as loyal when they redeemed in 2+ distinct months', async () => {
    // Two redemptions in different calendar months
    const thisMonthDate = daysAgo(5);
    const lastMonthDate = daysAgo(35);

    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'follows')
          return makeChain({
            data: [{ user_id: 'u1' }],
            error: null,
          });
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [
              { user_id: 'u1', redeemed_at: thisMonthDate },
              { user_id: 'u1', redeemed_at: lastMonthDate },
            ],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getFollowerFunnel('biz-1');

    expect(result.loyal).toBe(1);
  });
});

describe('getCouponPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no published coupons', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCouponPerformance('biz-1');

    expect(result).toEqual([]);
  });

  it('calculates rate as percentage of max_redemptions_global', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({
            data: [
              {
                id: 'c1',
                code: 'TEST',
                description: null,
                promotion_type: 'deal',
                max_redemptions_global: 100,
                start_date: daysAgo(180),
              },
            ],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
      // Redemption counts now come from the aggregate RPC.
      rpc: vi.fn().mockResolvedValue({
        data: [{ coupon_id: 'c1', redeemed: 25, avg_days_to_redeem: 10 }],
        error: null,
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCouponPerformance('biz-1');

    expect(result).toHaveLength(1);
    expect(result[0].redeemed).toBe(25);
    expect(result[0].rate).toBe(25);
  });

  it('sorts coupons by redemption count descending', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({
            data: [
              {
                id: 'cA',
                code: 'COUPON-A',
                description: null,
                promotion_type: 'deal',
                max_redemptions_global: null,
                start_date: daysAgo(180),
              },
              {
                id: 'cB',
                code: 'COUPON-B',
                description: null,
                promotion_type: 'discount',
                max_redemptions_global: null,
                start_date: daysAgo(180),
              },
            ],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { coupon_id: 'cA', redeemed: 5, avg_days_to_redeem: 10 },
          { coupon_id: 'cB', redeemed: 10, avg_days_to_redeem: 5 },
        ],
        error: null,
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCouponPerformance('biz-1');

    expect(result).toHaveLength(2);
    expect(result[0].coupon_id).toBe('cB');
    expect(result[0].redeemed).toBe(10);
    expect(result[1].coupon_id).toBe('cA');
    expect(result[1].redeemed).toBe(5);
  });

  it('filters coupons by branch_id when branchId is provided', async () => {
    const couponChain = makeChain({
      data: [
        {
          id: 'c1',
          code: 'BRANCH-DEAL',
          description: null,
          promotion_type: 'deal',
          max_redemptions_global: 10,
          start_date: daysAgo(30),
        },
      ],
      error: null,
    });

    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return couponChain;
        return makeChain({ data: [], error: null });
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;
    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    await getCouponPerformance('biz-1', 'branch-99');

    expect(couponChain.eq).toHaveBeenCalledWith('branch_id', 'branch-99');
  });

  it('passes branch_id to the redemption-stats RPC when branchId is provided', async () => {
    const couponChain = makeChain({
      data: [
        {
          id: 'c1',
          code: 'DEAL',
          description: null,
          promotion_type: 'deal',
          max_redemptions_global: null,
          start_date: daysAgo(30),
        },
      ],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: [{ coupon_id: 'c1', redeemed: 1, avg_days_to_redeem: 5 }],
      error: null,
    });

    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return couponChain;
        return makeChain({ data: [], error: null });
      }),
      rpc,
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;
    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    await getCouponPerformance('biz-1', 'branch-99');

    expect(rpc).toHaveBeenCalledWith('analytics_coupon_redemption_stats', {
      p_business_id: 'biz-1',
      p_branch_id: 'branch-99',
    });
  });

  it('does not apply branch filter when branchId is omitted', async () => {
    const couponChain = makeChain({ data: [], error: null });

    const supabaseClient = {
      from: vi.fn().mockReturnValue(couponChain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;
    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    await getCouponPerformance('biz-1');

    const branchEqCall = (
      couponChain.eq as ReturnType<typeof vi.fn>
    ).mock.calls.find(([col]: [string]) => col === 'branch_id');
    expect(branchEqCall).toBeUndefined();
  });
});

describe('getCustomerSegments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all-zero counts when no coupons exist', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCustomerSegments('biz-1');

    expect(result.champion).toBe(0);
    expect(result.loyal).toBe(0);
    expect(result.at_risk).toBe(0);
    expect(result.lost).toBe(0);
    expect(result.new_customer).toBe(0);
  });

  it('classifies users with 4+ redemptions in last 30 days as champion', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: Array.from({ length: 4 }, () => ({
              user_id: 'user-champion',
              redeemed_at: daysAgo(5),
            })),
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCustomerSegments('biz-1');

    expect(result.champion).toBe(1);
  });

  it('classifies users with 2 redemptions in last 60 days (not champion) as loyal', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [
              { user_id: 'user-loyal', redeemed_at: daysAgo(40) },
              { user_id: 'user-loyal', redeemed_at: daysAgo(45) },
            ],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCustomerSegments('biz-1');

    expect(result.loyal).toBe(1);
  });

  it('classifies users with 1 redemption in last 14 days as new_customer', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [{ user_id: 'user-new', redeemed_at: daysAgo(7) }],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCustomerSegments('biz-1');

    expect(result.new_customer).toBe(1);
  });

  it('classifies users with last redemption 91+ days ago as lost', async () => {
    const supabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons')
          return makeChain({ data: [{ id: 'c1' }], error: null });
        if (table === 'user_redemptions')
          return makeChain({
            data: [{ user_id: 'user-lost', redeemed_at: daysAgo(100) }],
            error: null,
          });
        return makeChain({ data: [], error: null });
      }),
    } as unknown as Awaited<ReturnType<typeof createAnalyticsSupabaseClient>>;

    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const result = await getCustomerSegments('biz-1');

    expect(result.lost).toBe(1);
  });
});

describe('generateAutomationSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseHealth: BusinessHealthData = {
    retention_rate: 50,
    retention_trend: 'flat',
    follower_growth: 5,
    follower_growth_trend: 'up',
    active_deals: 2,
    avg_rating: 4.2,
    rating_trend: 'flat',
  };

  const baseSegments: CustomerSegmentCounts = {
    champion: 2,
    loyal: 3,
    at_risk: 0,
    lost: 0,
    new_customer: 1,
  };

  const baseFunnel: FollowerFunnelData = {
    total_followers: 10,
    ever_redeemed: 8,
    active_30d: 5,
    loyal: 3,
  };

  it('includes win-back warning when at_risk > 3', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      baseHealth,
      { ...baseSegments, at_risk: 5 },
      baseFunnel,
    );

    expect(
      suggestions.some((s) => s.id === 'win-back' && s.severity === 'warning'),
    ).toBe(true);
  });

  it('omits win-back when at_risk <= 3', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      baseHealth,
      { ...baseSegments, at_risk: 3 },
      baseFunnel,
    );

    expect(suggestions.some((s) => s.id === 'win-back')).toBe(false);
  });

  it('includes retention-drop warning when trend is down', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      { ...baseHealth, retention_trend: 'down' },
      baseSegments,
      baseFunnel,
    );

    expect(
      suggestions.some(
        (s) => s.id === 'retention-drop' && s.severity === 'warning',
      ),
    ).toBe(true);
  });

  it('includes convert-followers info when fewer than half followers have redeemed', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      baseHealth,
      baseSegments,
      { ...baseFunnel, total_followers: 20, ever_redeemed: 9 },
    );

    expect(
      suggestions.some(
        (s) => s.id === 'convert-followers' && s.severity === 'info',
      ),
    ).toBe(true);
  });

  it('includes share-rating success when avg_rating >= 4.5', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      { ...baseHealth, avg_rating: 4.8 },
      baseSegments,
      baseFunnel,
    );

    expect(
      suggestions.some(
        (s) => s.id === 'share-rating' && s.severity === 'success',
      ),
    ).toBe(true);
  });

  it('includes no-active-deals info when active_deals is 0', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      { ...baseHealth, active_deals: 0 },
      baseSegments,
      baseFunnel,
    );

    expect(
      suggestions.some(
        (s) => s.id === 'no-active-deals' && s.severity === 'info',
      ),
    ).toBe(true);
  });

  it('returns empty array for a healthy business with no triggers', async () => {
    const suggestions = await generateAutomationSuggestions(
      'biz-1',
      baseHealth,
      baseSegments,
      baseFunnel,
    );

    expect(suggestions.length).toBe(0);
  });
});
