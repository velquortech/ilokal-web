import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as query from '@/lib/api/analytics/businessAnalyticsQuery';
import * as service from '@/lib/api/analytics/businessAnalyticsService';

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

  it('product performance returns array', async () => {
    vi.mocked(query.getProductPerformance).mockResolvedValueOnce([
      { product_id: 'p1', units_sold: 10, revenue: 200 },
    ]);
    const res = await service.getProductPerformance('b1');
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
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
});
