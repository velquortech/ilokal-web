import http from './client';
import type { ApiResponse } from '@/lib/types';

export type CheckoutRequest = {
  amount: number;
  currency: string;
  payment_method: string;
  business_id?: string;
  metadata?: Record<string, unknown>;
};

const paymentsPublicService = {
  async checkout(input: CheckoutRequest): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.post('/payments/checkout', input);
      return { success: true, data: res } as ApiResponse<unknown>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      } as ApiResponse;
    }
  },
};

export default paymentsPublicService;
