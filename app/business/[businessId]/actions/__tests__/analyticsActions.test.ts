import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  BusinessAnalyticsDashboard,
  BusinessHealthData,
  CustomerSegmentCounts,
  FollowerFunnelData,
  AutomationSuggestion,
  RetentionMonth,
  MonthlyTrendPoint,
  CouponPerformanceItem,
} from '@/lib/types';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/analytics/businessAnalyticsService');
vi.mock('@/lib/api/analytics/businessAnalyticsQuery');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as analyticsService from '@/lib/api/analytics/businessAnalyticsService';
import * as analyticsQuery from '@/lib/api/analytics/businessAnalyticsQuery';
import { getBusinessAnalyticsDashboardAction } from '@/app/business/[businessId]/actions/analyticsActions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BIZ_ID = 'test-biz-id';

function mockAuthorized(): void {
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    authorized: true as const,
    business: { id: BIZ_ID },
    user: { id: 'user-1' },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
}

function mockUnauthorized(): void {
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    authorized: false as const,
    error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------
const mockHealth: BusinessHealthData = {
  retention_rate: 65,
  retention_trend: 'up',
  follower_growth: 8,
  follower_growth_trend: 'up',
  active_deals: 3,
  avg_rating: 4.3,
  rating_trend: 'flat',
};

const mockSegments: CustomerSegmentCounts = {
  champion: 3,
  loyal: 5,
  at_risk: 2,
  lost: 1,
  new_customer: 2,
};

const mockFunnel: FollowerFunnelData = {
  total_followers: 25,
  ever_redeemed: 18,
  active_30d: 10,
  loyal: 8,
};

const mockSuggestions: AutomationSuggestion[] = [
  { id: 'test-1', message: 'Test suggestion', severity: 'info' },
];

const mockRetention: RetentionMonth[] = Array.from({ length: 6 }, (_, i) => ({
  month: `Month${i}`,
  new_customers: i,
  returning_customers: 0,
  churned_customers: 0,
}));

const mockTrend: MonthlyTrendPoint[] = Array.from({ length: 6 }, (_, i) => ({
  month: `Month${i}`,
  followers: i * 2,
  redemptions: i,
}));

const mockCouponPerformance: CouponPerformanceItem[] = [
  {
    coupon_id: 'c1',
    code: 'DEAL10',
    description: null,
    promotion_type: 'deal',
    max_redemptions: 50,
    redeemed: 20,
    rate: 40,
    avg_days_to_redeem: 5,
  },
];

// ---------------------------------------------------------------------------
// Helper: set up all service mocks to return success
// ---------------------------------------------------------------------------
function mockAllServicesSuccess(): void {
  vi.mocked(analyticsService.getRetentionData).mockResolvedValue({
    success: true,
    data: mockRetention,
  });
  vi.mocked(analyticsService.getMonthlyTrend).mockResolvedValue({
    success: true,
    data: mockTrend,
  });
  vi.mocked(analyticsService.getFollowerFunnel).mockResolvedValue({
    success: true,
    data: mockFunnel,
  });
  vi.mocked(analyticsService.getCouponPerformance).mockResolvedValue({
    success: true,
    data: mockCouponPerformance,
  });
  vi.mocked(analyticsService.getCustomerSegments).mockResolvedValue({
    success: true,
    data: mockSegments,
  });
  vi.mocked(analyticsService.getBusinessHealthIndicators).mockResolvedValue({
    success: true,
    data: mockHealth,
  });
  vi.mocked(analyticsQuery.generateAutomationSuggestions).mockResolvedValue(
    mockSuggestions,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('getBusinessAnalyticsDashboardAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns UNAUTHORIZED when verifyBusinessOwner fails', async () => {
    mockUnauthorized();

    const res = await getBusinessAnalyticsDashboardAction(BIZ_ID);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns full dashboard when all services succeed', async () => {
    mockAuthorized();
    mockAllServicesSuccess();

    const res = await getBusinessAnalyticsDashboardAction(BIZ_ID);

    expect(res.success).toBe(true);

    const data = res.data as BusinessAnalyticsDashboard;
    expect(data.health).toEqual(mockHealth);
    expect(data.segments).toEqual(mockSegments);
    expect(data.funnel).toEqual(mockFunnel);
    expect(data.trend).toEqual(mockTrend);
    expect(data.retention).toEqual(mockRetention);
    expect(data.couponPerformance).toEqual(mockCouponPerformance);
    expect(data.suggestions).toEqual(mockSuggestions);
  });

  it('uses empty fallbacks when a service fails', async () => {
    mockAuthorized();
    mockAllServicesSuccess();

    // Override getRetentionData to simulate failure
    vi.mocked(analyticsService.getRetentionData).mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed' },
    });

    const res = await getBusinessAnalyticsDashboardAction(BIZ_ID);

    expect(res.success).toBe(true);
    const data = res.data as BusinessAnalyticsDashboard;
    expect(data.retention).toEqual([]);
    // Other fields should still be populated
    expect(data.health).toEqual(mockHealth);
  });

  it('uses empty segment fallback when getCustomerSegments fails', async () => {
    mockAuthorized();
    mockAllServicesSuccess();

    vi.mocked(analyticsService.getCustomerSegments).mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed' },
    });

    const res = await getBusinessAnalyticsDashboardAction(BIZ_ID);

    expect(res.success).toBe(true);
    const data = res.data as BusinessAnalyticsDashboard;
    expect(data.segments).toEqual({
      champion: 0,
      loyal: 0,
      at_risk: 0,
      lost: 0,
      new_customer: 0,
    });
  });

  it('returns INTERNAL_ERROR when an unexpected exception is thrown', async () => {
    vi.mocked(verifyBusinessOwner).mockRejectedValueOnce(
      new Error('Unexpected crash'),
    );

    const res = await getBusinessAnalyticsDashboardAction(BIZ_ID);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
