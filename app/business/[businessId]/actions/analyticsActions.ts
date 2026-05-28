'use server';

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as analyticsService from '@/lib/api/analytics/businessAnalyticsService';
import * as analyticsQuery from '@/lib/api/analytics/businessAnalyticsQuery';
import type { ApiResponse, BusinessAnalyticsDashboard } from '@/lib/types';

export async function getBusinessAnalyticsDashboardAction(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<BusinessAnalyticsDashboard>> {
  try {
    const verify = await verifyBusinessOwner(businessId);
    if (!verify.authorized) {
      return {
        success: false,
        error: verify.error as { code: string; message: string },
      };
    }

    const [
      retentionRes,
      trendRes,
      funnelRes,
      couponRes,
      segmentsRes,
      healthRes,
    ] = await Promise.all([
      analyticsService.getRetentionData(businessId, branchId),
      analyticsService.getMonthlyTrend(businessId, branchId),
      analyticsService.getFollowerFunnel(businessId, branchId),
      analyticsService.getCouponPerformance(businessId, branchId),
      analyticsService.getCustomerSegments(businessId, branchId),
      analyticsService.getBusinessHealthIndicators(businessId, branchId),
    ]);

    const health = healthRes.success
      ? healthRes.data!
      : {
          retention_rate: null,
          retention_trend: 'flat' as const,
          follower_growth: 0,
          follower_growth_trend: 'flat' as const,
          active_deals: 0,
          avg_rating: null,
          rating_trend: 'flat' as const,
        };

    const segments = segmentsRes.success
      ? segmentsRes.data!
      : { champion: 0, loyal: 0, at_risk: 0, lost: 0, new_customer: 0 };

    const funnel = funnelRes.success
      ? funnelRes.data!
      : { total_followers: 0, ever_redeemed: 0, active_30d: 0, loyal: 0 };

    const suggestions = await analyticsQuery.generateAutomationSuggestions(
      businessId,
      health,
      segments,
      funnel,
    );

    return {
      success: true,
      data: {
        health,
        trend: trendRes.success ? trendRes.data! : [],
        segments,
        retention: retentionRes.success ? retentionRes.data! : [],
        funnel,
        couponPerformance: couponRes.success ? couponRes.data! : [],
        suggestions,
      },
    };
  } catch (error) {
    console.error('[getBusinessAnalyticsDashboardAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load analytics' },
    };
  }
}
