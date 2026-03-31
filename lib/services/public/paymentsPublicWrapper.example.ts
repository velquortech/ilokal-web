/**
 * EXAMPLE: Browser-safe wrapper for payments operations.
 *
 * This example shows the recommended pattern for isomorphic public wrappers:
 * 1. Server-fast-path: dynamically imports server module when on server runtime
 * 2. Browser fallback: POSTs to `app/api/payments/checkout` route in browser
 * 3. No top-level server imports: ensures server-only helpers don't leak to client bundle
 *
 * NOTE: In this codebase, use `paymentsPublicService` directly (it's already
 * implemented with this pattern). This file is just for reference/documentation.
 */

import http from '../client';
import type { ApiResponse, CheckoutRequest } from '@/lib/types';

/**
 * Example implementation of a browser-safe payments wrapper
 */
export async function createCheckoutSession(
  input: CheckoutRequest,
): Promise<ApiResponse<unknown>> {
  // Server-fast-path: when on server and not in test, use server helpers directly
  if (typeof window === 'undefined' && !process.env.VITEST) {
    try {
      // Dynamically import server modules only when needed (reduces client bundle impact)
      const [paymentMod, userMod] = await Promise.all([
        import('@/lib/api/payments/paymentService'),
        import('@/lib/api/getCurrentUser'),
      ]);

      // Get current user from server context
      const user = await userMod.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        } as ApiResponse<unknown>;
      }

      // Call server implementation directly
      return await paymentMod.createCheckoutSession(user.id, input);
    } catch (err: unknown) {
      // If server-fast-path fails (e.g., no request scope in Vitest), fall back to HTTP
      console.error('[createCheckoutSession] server-fast-path error', err);
      // Continue to HTTP fallback below
    }
  }

  // Browser fallback: POST to public API route
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
}

export default { createCheckoutSession };
