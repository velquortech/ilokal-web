import type { ApiResponse } from '@/lib/types';
import type {
  BusinessDashboard,
  CouponStats,
  TrafficMetrics,
  BusinessRevenue,
  RetentionMonth,
  MonthlyTrendPoint,
  FollowerFunnelData,
  CouponPerformanceItem,
  CustomerSegmentCounts,
  BusinessHealthData,
} from '@/lib/types';
import * as query from './businessAnalyticsQuery';

export async function getBusinessDashboard(
  businessId: string,
): Promise<ApiResponse<BusinessDashboard>> {
  try {
    const data = await query.getBusinessDashboard(businessId);
    return { success: true, data };
  } catch (error) {
    console.error('[getBusinessDashboard]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch business dashboard',
      },
    };
  }
}

export async function getCouponStats(
  businessId: string,
): Promise<ApiResponse<CouponStats[]>> {
  try {
    const data = await query.getCouponStats(businessId);
    return { success: true, data };
  } catch (error) {
    console.error('[getCouponStats]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch coupon stats',
      },
    };
  }
}

export async function getTrafficMetrics(
  businessId: string,
): Promise<ApiResponse<TrafficMetrics>> {
  try {
    const data = await query.getTrafficMetrics(businessId);
    return { success: true, data };
  } catch (error) {
    console.error('[getTrafficMetrics]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch traffic metrics',
      },
    };
  }
}

export async function getBusinessRevenue(
  businessId: string,
): Promise<ApiResponse<BusinessRevenue>> {
  try {
    const data = await query.getBusinessRevenue(businessId);
    return { success: true, data };
  } catch (error) {
    console.error('[getBusinessRevenue]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch business revenue',
      },
    };
  }
}

export async function getRetentionData(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<RetentionMonth[]>> {
  try {
    const data = await query.getRetentionData(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getRetentionData]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch retention data',
      },
    };
  }
}

export async function getMonthlyTrend(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<MonthlyTrendPoint[]>> {
  try {
    const data = await query.getMonthlyTrend(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getMonthlyTrend]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch monthly trend',
      },
    };
  }
}

export async function getFollowerFunnel(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<FollowerFunnelData>> {
  try {
    const data = await query.getFollowerFunnel(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getFollowerFunnel]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch follower funnel',
      },
    };
  }
}

export async function getCouponPerformance(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<CouponPerformanceItem[]>> {
  try {
    const data = await query.getCouponPerformance(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getCouponPerformance]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch coupon performance',
      },
    };
  }
}

export async function getCustomerSegments(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<CustomerSegmentCounts>> {
  try {
    const data = await query.getCustomerSegments(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getCustomerSegments]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch customer segments',
      },
    };
  }
}

export async function getBusinessHealthIndicators(
  businessId: string,
  branchId?: string,
): Promise<ApiResponse<BusinessHealthData>> {
  try {
    const data = await query.getBusinessHealthIndicators(businessId, branchId);
    return { success: true, data };
  } catch (error) {
    console.error('[getBusinessHealthIndicators]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch business health indicators',
      },
    };
  }
}
