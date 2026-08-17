import type { ApiResponse } from '@/lib/types';
import type { BidaAnalyticsPayload } from '@/lib/types/bidaAnalytics';
import * as query from './bidaAnalyticsQuery';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

export async function getBidaAnalytics(
  businessId: string,
): Promise<ApiResponse<BidaAnalyticsPayload>> {
  try {
    const data = await query.getBidaAnalytics(businessId);
    return { success: true, data };
  } catch (error) {
    console.error('[getBidaAnalytics]', formatErrorForLog(error));
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch Bida Ngayon analytics',
      },
    };
  }
}
