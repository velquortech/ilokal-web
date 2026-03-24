import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as analyticsQuery from '@/lib/api/admin/analyticsQuery';
import * as analyticsService from '@/lib/api/admin/analyticsService';

vi.mock('@/lib/api/admin/analyticsQuery');

describe('admin analytics service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns platform analytics on success', async () => {
    vi.mocked(analyticsQuery.getPlatformOverview).mockResolvedValueOnce({
      user_count: 100,
      business_count: 20,
      active_business_count: 18,
      total_revenue: 123456,
    });

    const res = await analyticsService.getPlatformAnalytics();
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.user_count).toBe(100);
  });

  it('returns error when query throws', async () => {
    vi.mocked(analyticsQuery.getPlatformOverview).mockRejectedValueOnce(
      new Error('db'),
    );
    const res = await analyticsService.getPlatformAnalytics();
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
