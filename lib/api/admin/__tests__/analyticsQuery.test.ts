/**
 * Admin Analytics Query Tests - Phase G
 * Database read operations for platform analytics
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getPlatformOverview,
  getUserMetrics,
  getRevenueMetrics,
  getAdminDashboardSummary,
} from '../analyticsQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('analyticsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlatformOverview', () => {
    it('should return overall platform metrics', async () => {
      const eqResult = {
        count: 50,
        error: null,
        is: vi.fn().mockReturnValue({ count: 50, error: null }),
      };
      const selectResult = {
        count: 100,
        error: null,
        eq: vi.fn().mockReturnValue(eqResult),
        gte: vi.fn().mockReturnValue({ count: 30, error: null }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getPlatformOverview();

      expect(result.user_count).toBe(100);
      expect(result.business_count).toBe(100);
      expect(result.active_business_count).toBe(50);
      expect(result.total_revenue).toBe(0);
    });

    it('should return zero values when no data exists', async () => {
      const eqResult = {
        count: null,
        error: null,
        data: null,
        is: vi.fn().mockReturnValue({ count: null, error: null, data: null }),
      };
      const selectResult = {
        count: null,
        error: null,
        data: null,
        eq: vi.fn().mockReturnValue(eqResult),
        gte: vi.fn().mockReturnValue({ count: null, error: null, data: null }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getPlatformOverview();

      expect(result.user_count).toBe(0);
      expect(result.business_count).toBe(0);
      expect(result.active_business_count).toBe(0);
      expect(result.total_revenue).toBe(0);
    });

    it('should handle missing revenue sum data', async () => {
      const eqResult = {
        count: 50,
        error: null,
        data: [],
        is: vi.fn().mockReturnValue({ count: 50, error: null, data: [] }),
      };
      const selectResult = {
        count: 100,
        error: null,
        data: [],
        eq: vi.fn().mockReturnValue(eqResult),
        gte: vi.fn().mockReturnValue({ count: 30, error: null, data: [] }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getPlatformOverview();

      expect(result.total_revenue).toBe(0);
    });
  });

  describe('getUserMetrics', () => {
    it('should return user metrics including 30-day new users', async () => {
      const selectResult = {
        count: 15432,
        error: null,
        eq: vi.fn().mockReturnValue({ count: 50, error: null }),
        gte: vi.fn().mockReturnValue({ count: 234, error: null }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getUserMetrics();

      expect(result.total_users).toBe(15432);
      expect(result.new_users_last_30_days).toBe(234);
    });

    it('should calculate new users for last 30 days', async () => {
      const selectResult = {
        count: 10000,
        error: null,
        eq: vi.fn().mockReturnValue({ count: 50, error: null }),
        gte: vi.fn().mockReturnValue({ count: 150, error: null }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getUserMetrics();

      expect(result.new_users_last_30_days).toBe(150);
      expect(result.new_users_last_30_days).toBeLessThan(result.total_users);
    });

    it('should handle missing user count', async () => {
      const selectResult = {
        count: null,
        error: null,
        data: null,
        eq: vi.fn().mockReturnValue({ count: null, error: null }),
        gte: vi.fn().mockReturnValue({ count: null, error: null }),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getUserMetrics();

      expect(result.total_users).toBe(0);
      expect(result.new_users_last_30_days).toBe(0);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should return total and 30-day revenue metrics', async () => {
      const eqResult = {
        data: [{ sum: 500000 }],
        error: null,
        gte: vi.fn().mockReturnValue({ data: [{ sum: 150000 }], error: null }),
      };

      const selectResult = {
        error: null,
        eq: vi.fn().mockReturnValue(eqResult),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getRevenueMetrics();

      expect(result.total_revenue).toBe(500000);
      expect(result.revenue_last_30_days).toBe(150000);
    });

    it('should return zero revenue when no payments exist', async () => {
      const eqResult = {
        data: [],
        error: null,
        gte: vi.fn().mockReturnValue({ data: [], error: null }),
      };

      const selectResult = {
        error: null,
        eq: vi.fn().mockReturnValue(eqResult),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getRevenueMetrics();

      expect(result.total_revenue).toBe(0);
      expect(result.revenue_last_30_days).toBe(0);
    });

    it('should calculate 30-day revenue separately from total', async () => {
      const eqResult = {
        data: [{ sum: 1000000 }],
        error: null,
        gte: vi.fn().mockReturnValue({ data: [{ sum: 100000 }], error: null }),
      };

      const selectResult = {
        error: null,
        eq: vi.fn().mockReturnValue(eqResult),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getRevenueMetrics();

      expect(result.total_revenue).toBeGreaterThan(result.revenue_last_30_days);
      expect(result.total_revenue).toBe(1000000);
      expect(result.revenue_last_30_days).toBe(100000);
    });

    it('should handle null revenue data', async () => {
      const eqResult = {
        data: [{ sum: null }],
        error: null,
        gte: vi.fn().mockReturnValue({ data: [{ sum: null }], error: null }),
      };

      const selectResult = {
        error: null,
        eq: vi.fn().mockReturnValue(eqResult),
      };

      const supabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(selectResult),
        }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getRevenueMetrics();

      expect(result.total_revenue).toBe(0);
      expect(result.revenue_last_30_days).toBe(0);
    });
  });
});

describe('getAdminDashboardSummary — business counts by origin', () => {
  /**
   * The "Businesses · Registered shops" card used to show every row, which
   * after the OpenStreetMap import meant ~1,503 where 21 shops had actually
   * registered. A dashboard that overstates the platform seventyfold is worse
   * than no dashboard, so the card reports owner-registered and carries the
   * seeded count alongside it.
   */
  function clientCounting(counts: Record<string, number>) {
    // `countRows` awaits whatever the filter chain returns, so every node has
    // to be both chainable and awaitable. Filters accumulate into a key so a
    // call can resolve to the count for its exact combination.
    type Node = {
      count: number;
      error: null;
      is: Mock;
      eq: Mock;
      gte: Mock;
      not: Mock;
    };
    const node = (filters: string[]): Node => {
      const key = filters.length ? filters.join('+') : 'all';
      return {
        count: counts[key] ?? 0,
        error: null,
        is: vi.fn(() => node(filters)), // archived_at IS NULL — no bucket of its own
        eq: vi.fn((col: string, val: string) =>
          node([...filters, `${col}:${val}`]),
        ),
        gte: vi.fn(() => node([...filters, 'recent'])),
        // registration_completed_at IS NOT NULL — scopes, no bucket of its own
        not: vi.fn(() => node(filters)),
      };
    };
    return {
      from: vi.fn(() => ({ select: vi.fn(() => node([])) })),
    };
  }

  it('reports owner-registered and admin-seeded separately', async () => {
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      clientCounting({
        all: 1503,
        'origin:owner': 21,
        'origin:admin': 1482,
        'status:verified': 1503,
        'status:pending': 0,
      }),
    );

    const summary = await getAdminDashboardSummary();

    expect(summary.owner_businesses).toBe(21);
    expect(summary.seeded_businesses).toBe(1482);
    // The raw total stays available; it is simply no longer the headline.
    expect(summary.total_businesses).toBe(1503);
    expect(summary.failed).toBe(false);
  });
});
