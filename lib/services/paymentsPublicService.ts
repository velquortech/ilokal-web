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
    // Server fast-path: create checkout session directly using server paymentService
    // Skip server-fast-path during Vitest runs to avoid `cookies` request-scope errors
    if (typeof window === 'undefined' && !process.env.VITEST) {
      try {
        const [paymentMod, userMod] = await Promise.all([
          import('@/lib/api/payments/paymentService'),
          import('@/lib/api/getCurrentUser'),
        ]);
        const user = await userMod.getCurrentUser();
        if (!user) {
          return {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
          } as ApiResponse<unknown>;
        }
        return await paymentMod.createCheckoutSession(user.id, input);
      } catch (err: unknown) {
        // If server fast-path fails (eg. no request scope in tests), fall back to HTTP POST
        console.error(
          '[paymentsPublicService.checkout] server fast-path error',
          err,
        );
        try {
          const res = await http.post('/payments/checkout', input);
          return { success: true, data: res } as ApiResponse<unknown>;
        } catch (e: unknown) {
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: e instanceof Error ? e.message : String(e),
            },
          } as ApiResponse;
        }
      }
    }

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
