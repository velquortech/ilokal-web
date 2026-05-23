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
// These services are truly read-only and do NOT import server-only helpers at module-level,
// including dynamic imports that Turbopack/Next.js would include in the client bundle.
export { default as userService } from './userService';
export { default as http } from './client';
export { default as ratingService } from './ratingService';
export { default as featuredDealService } from './featuredDealService';
export { default as branchService } from './branchService';
export { default as uploadService } from './uploadService';
export { default as trendingService } from './trendingService';
export { default as productCategoryService } from './productCategoryService';

// NOTE: The following services are intentionally NOT exported here because
// they import server-only helpers (directly or via dynamic import). Even dynamic
// imports are included in the client bundle by Turbopack's static analyzer.
// Import them directly in server-only callsites (Server Components, Server Actions, API routes) when needed:
// - productService (create/update/delete product & category flows)
// - categoryService (create/update/delete category flows)
// - invoiceService (read/write invoice flows with auth requirements)
// - searchService (search with server-side filters and auth)
// - analyticsService (analytics queries requiring auth/admin context)
// - authService (getMe requires server helper for session access)
// - reviewService (review mutations require server auth)
// - paymentService (confirm/refund flows)
// - subscriptionService (subscription mutation flows)
// - couponService (coupon mutation flows)
// - businessService / businessPublicService (business write flows)
// - notificationService (notification send flows)
// - paymentsPublicService (payment session flows)
// If you need a browser-safe wrapper for any of the above, create an
// explicit isomorphic wrapper (eg. `lib/services/public/<name>Wrapper.ts`) that
// does NOT dynamically import server modules (use API routes instead).

// Re-export types/helpers that are client-safe for gradual migration.
export type { PaginatedResponse } from './utils/paginationService';
export type { AdminCreateUserInput } from '@/lib/types/admin';
export type {
  UpdateUserInput,
  AdminUpdateUserInput,
} from '@/services/api/userService';
export {
  getOffset,
  getTotalPages,
  createPaginatedResponse,
} from './utils/paginationService';
