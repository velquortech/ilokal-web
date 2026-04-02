/**
 * Admin Analytics Query Tests - Phase G
 * Database read operations for platform analytics
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getPlatformOverview,
  getUserMetrics,
  getRevenueMetrics,
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
      const selectResult = {
        count: 100,
        error: null,
        eq: vi.fn().mockReturnValue({ count: 50, error: null }),
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
      const selectResult = {
        count: null,
        error: null,
        data: null,
        eq: vi.fn().mockReturnValue({ count: null, error: null, data: null }),
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
      const selectResult = {
        count: 100,
        error: null,
        data: [],
        eq: vi.fn().mockReturnValue({ count: 50, error: null, data: [] }),
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
