/*
  Client-facing services barrel

  Purpose:
  - This file re-exports services safe to import from client-side code.
  - DO NOT export services here that depend on server-only APIs (for
    example: Next.js `next/headers`, `createServerSupabaseClient`, or other
    helpers that read secrets/environment or the incoming request).

  Rules / Usage:
  - Client code should import from this barrel (e.g. `@/lib/services`) only
    for services listed below.
  - Server-only services (payment, subscription, business/admin write flows,
    notification, etc.) must be imported directly from their module in
    server-only callsites (API routes, server actions, or Server Components).
    Example: `import paymentService from '@/lib/services/paymentService'`
    inside an `app/api/.../route.ts` or a Server Component only.
  - If you need to expose a read-only public wrapper for the browser, create
    an isomorphic wrapper that implements a server-fast-path (dynamic
    server import) and a browser HTTP fallback, and ensure that wrapper does
    not import server-only modules at top-level.
*/

// Client-safe services (can be imported from the browser)
export { default as userService } from './userService';
export { default as http } from './client';
export { default as productService } from './productService';
export { default as ratingService } from './ratingService';
export { default as featuredDealService } from './featuredDealService';
export { default as branchService } from './branchService';
export { default as uploadService } from './uploadService';
export { default as analyticsService } from './analyticsService';
export { default as reviewService } from './reviewService';
export { default as searchService } from './searchService';
export { default as categoryService } from './categoryService';
export { default as invoiceService } from './invoiceService';
export { default as authService } from './authService';
export { default as trendingService } from './trendingService';

// NOTE: The following services are intentionally NOT exported here because
// they are server-aware and may import server-only helpers. Import them
// directly in server-only callsites when needed:
// - paymentService (confirm/refund flows)
// - subscriptionService
// - couponService
// - businessService / businessPublicService
// - notificationService
// - paymentsPublicService
// If you need a browser-safe wrapper for any of the above, create an
// explicit isomorphic wrapper (eg. `lib/services/<name>Public.ts`) that
// implements a safe fallback and does not import server-only modules at
// module initialization time.

// Re-export types/helpers that are client-safe for gradual migration.
export type { PaginatedResponse } from '@/services/api/paginationService';
export type { AdminCreateUserInput } from '@/lib/types/admin';
export type {
  UpdateUserInput,
  AdminUpdateUserInput,
} from '@/services/api/userService';
export {
  getOffset,
  getTotalPages,
  createPaginatedResponse,
} from '@/services/api/paginationService';
