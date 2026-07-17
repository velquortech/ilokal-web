import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as query from '@/lib/api/analytics/businessAnalyticsQuery';
import * as service from '@/lib/api/analytics/businessAnalyticsService';
import type {
  RetentionMonth,
  MonthlyTrendPoint,
  FollowerFunnelData,
  CouponPerformanceItem,
  CustomerSegmentCounts,
  BusinessHealthData,
} from '@/lib/types';

vi.mock('@/lib/api/analytics/businessAnalyticsQuery');

describe('business analytics service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dashboard returns data', async () => {
    vi.mocked(query.getBusinessDashboard).mockResolvedValueOnce({
      business_id: 'b1',
      product_count: 5,
      active_products: 4,
      total_revenue: 1000,
      revenue_last_30_days: 100,
    });
    const res = await service.getBusinessDashboard('b1');
    expect(res.success).toBe(true);
    expect(res.data?.business_id).toBe('b1');
  });

  it('coupon stats returns array', async () => {
    vi.mocked(query.getCouponStats).mockResolvedValueOnce([
      { coupon_id: 'c1', times_redeemed: 3, total_discount_amount: 150 },
    ]);
    const res = await service.getCouponStats('b1');
    expect(res.success).toBe(true);
  });

  it('traffic returns metrics', async () => {
    vi.mocked(query.getTrafficMetrics).mockResolvedValueOnce({
      business_id: 'b1',
      page_views_last_30_days: 200,
      unique_visitors_last_30_days: 80,
    });
    const res = await service.getTrafficMetrics('b1');
    expect(res.success).toBe(true);
  });

  it('revenue returns breakdown', async () => {
    vi.mocked(query.getBusinessRevenue).mockResolvedValueOnce({
      business_id: 'b1',
      total_revenue: 5000,
      revenue_by_month: { '2026-03': 1000 },
    });
    const res = await service.getBusinessRevenue('b1');
    expect(res.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // New service wrappers
  // ---------------------------------------------------------------------------

  it('getRetentionData returns 6-month retention array', async () => {
    const mockData: RetentionMonth[] = Array.from({ length: 6 }, (_, i) => ({
      month: `Month${i}`,
      new_customers: i,
      returning_customers: 0,
      churned_customers: 0,
    }));

    vi.mocked(query.getRetentionData).mockResolvedValueOnce(mockData);

    const res = await service.getRetentionData('b1');

    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(6);
  });

  it('getRetentionData wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getRetentionData).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getRetentionData('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getMonthlyTrend returns 6-month trend array', async () => {
    const mockData: MonthlyTrendPoint[] = Array.from({ length: 6 }, (_, i) => ({
      month: `Month${i}`,
      followers: i * 2,
      redemptions: i,
    }));

    vi.mocked(query.getMonthlyTrend).mockResolvedValueOnce(mockData);

    const res = await service.getMonthlyTrend('b1');

    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(6);
  });

  it('getMonthlyTrend wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getMonthlyTrend).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getMonthlyTrend('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getFollowerFunnel returns funnel data', async () => {
    const mockData: FollowerFunnelData = {
      total_followers: 15,
      ever_redeemed: 10,
      active_30d: 5,
      loyal: 3,
    };

    vi.mocked(query.getFollowerFunnel).mockResolvedValueOnce(mockData);

    const res = await service.getFollowerFunnel('b1');

    expect(res.success).toBe(true);
    expect(res.data?.total_followers).toBe(15);
    expect(res.data?.ever_redeemed).toBe(10);
    expect(res.data?.active_30d).toBe(5);
    expect(res.data?.loyal).toBe(3);
  });

  it('getFollowerFunnel wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getFollowerFunnel).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getFollowerFunnel('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getCouponPerformance returns sorted coupon array', async () => {
    const mockData: CouponPerformanceItem[] = [
      {
        coupon_id: 'c1',
        code: 'DEAL50',
        description: null,
        promotion_type: 'deal',
        max_redemptions: 100,
        redeemed: 50,
        rate: 50,
        avg_days_to_redeem: 3,
      },
    ];

    vi.mocked(query.getCouponPerformance).mockResolvedValueOnce(mockData);

    const res = await service.getCouponPerformance('b1');

    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data?.[0].coupon_id).toBe('c1');
  });

  it('getCouponPerformance wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getCouponPerformance).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getCouponPerformance('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getCustomerSegments returns segment counts', async () => {
    const mockData: CustomerSegmentCounts = {
      champion: 3,
      loyal: 5,
      at_risk: 2,
      lost: 1,
      new_customer: 4,
    };

    vi.mocked(query.getCustomerSegments).mockResolvedValueOnce(mockData);

    const res = await service.getCustomerSegments('b1');

    expect(res.success).toBe(true);
    expect(res.data?.champion).toBe(3);
    expect(res.data?.loyal).toBe(5);
  });

  it('getCustomerSegments wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getCustomerSegments).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getCustomerSegments('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getBusinessHealthIndicators returns health data', async () => {
    const mockData: BusinessHealthData = {
      retention_rate: 72,
      retention_trend: 'up',
      follower_growth: 12,
      follower_growth_trend: 'up',
      active_deals: 4,
      avg_rating: 4.5,
      rating_trend: 'flat',
    };

    vi.mocked(query.getBusinessHealthIndicators).mockResolvedValueOnce(
      mockData,
    );

    const res = await service.getBusinessHealthIndicators('b1');

    expect(res.success).toBe(true);
    expect(res.data?.retention_rate).toBe(72);
    expect(res.data?.retention_trend).toBe('up');
    expect(res.data?.avg_rating).toBe(4.5);
  });

  it('getBusinessHealthIndicators wraps thrown error as INTERNAL_ERROR', async () => {
    vi.mocked(query.getBusinessHealthIndicators).mockRejectedValueOnce(
      new Error('db failure'),
    );

    const res = await service.getBusinessHealthIndicators('b1');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
