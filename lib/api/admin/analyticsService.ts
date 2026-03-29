import type { ApiResponse } from '@/lib/types';
import type { AdminAnalyticsResponse } from '@/lib/types';
import * as analyticsQuery from './analyticsQuery';

export async function getPlatformAnalytics(): Promise<
  ApiResponse<AdminAnalyticsResponse>
> {
  try {
    const data = await analyticsQuery.getPlatformOverview();
    return { success: true, data };
  } catch (error) {
    console.error('[getPlatformAnalytics]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' },
    };
  }
}

export async function getUsersAnalytics(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  try {
    const data = await analyticsQuery.getUserMetrics();
    return { success: true, data } as ApiResponse<Record<string, unknown>>;
  } catch (error) {
    console.error('[getUsersAnalytics]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user analytics',
      },
    };
  }
}

export async function getRevenueAnalytics(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  try {
    const data = await analyticsQuery.getRevenueMetrics();
    return { success: true, data } as ApiResponse<Record<string, unknown>>;
  } catch (error) {
    console.error('[getRevenueAnalytics]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch revenue analytics',
      },
    };
  }
}

export async function getBusinessAnalytics(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  try {
    const data = await analyticsQuery.getBusinessMetrics();
    return { success: true, data } as ApiResponse<Record<string, unknown>>;
  } catch (error) {
    console.error('[getBusinessAnalytics]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch business analytics',
      },
    };
  }
}
