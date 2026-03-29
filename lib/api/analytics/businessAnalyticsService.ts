import type { ApiResponse } from '@/lib/types';
import type {
  BusinessDashboard,
  ProductPerformance,
  CouponStats,
  TrafficMetrics,
  BusinessRevenue,
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

export async function getProductPerformance(
  businessId: string,
  limit = 10,
): Promise<ApiResponse<ProductPerformance[]>> {
  try {
    const data = await query.getProductPerformance(businessId, limit);
    return { success: true, data };
  } catch (error) {
    console.error('[getProductPerformance]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch product performance',
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
