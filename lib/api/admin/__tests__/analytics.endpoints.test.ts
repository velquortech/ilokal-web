import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as analyticsService from '@/lib/api/admin/analyticsService';

vi.mock('@/lib/api/admin/analyticsService');

describe('admin analytics endpoints (service wrappers)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('users analytics returns data', async () => {
    vi.mocked(analyticsService.getUsersAnalytics).mockResolvedValueOnce({
      success: true,
      data: { total_users: 50, new_users_last_30_days: 5 },
    });
    const res = await analyticsService.getUsersAnalytics();
    expect(res.success).toBe(true);
    expect(res.data?.total_users).toBe(50);
  });

  it('revenue analytics returns data', async () => {
    vi.mocked(analyticsService.getRevenueAnalytics).mockResolvedValueOnce({
      success: true,
      data: { total_revenue: 10000, revenue_last_30_days: 2000 },
    });
    const res = await analyticsService.getRevenueAnalytics();
    expect(res.success).toBe(true);
    expect(res.data?.total_revenue).toBe(10000);
  });

  it('business analytics returns data', async () => {
    vi.mocked(analyticsService.getBusinessAnalytics).mockResolvedValueOnce({
      success: true,
      data: { total_businesses: 20, active_businesses: 18 },
    });
    const res = await analyticsService.getBusinessAnalytics();
    expect(res.success).toBe(true);
    expect(res.data?.total_businesses).toBe(20);
  });
});
