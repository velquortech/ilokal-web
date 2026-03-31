export { default as userService } from './userService';
export { default as http } from './client';
export { default as productService } from './productService';
// `paymentService` performs server-side operations (confirm/refund).
// Do NOT export it from this client-facing barrel; import directly from
// `lib/services/paymentService` in server-only code.
export { default as ratingService } from './ratingService';
// `subscriptionService` and `couponService` are server-aware and must not be
// exported through the client-facing barrel to avoid pulling server-only
// modules into client bundles. Import them directly from their files in
// server-only callsites when needed.
export { default as featuredDealService } from './featuredDealService';
export { default as branchService } from './branchService';
// `businessService` is server-aware and must not be exported through the
// client-facing barrel to avoid pulling server-only modules into client bundles.
// Import `lib/services/businessService` directly from server-only callsites.
// `notificationService` is server-aware (reads current user on server).
// Do NOT export it through the client-facing barrel; import directly
// from `lib/services/notificationService` in server-only callsites when needed.
export { default as uploadService } from './uploadService';
export { default as analyticsService } from './analyticsService';
// Re-export commonly used types from the legacy browser services so callers
// can migrate imports to `@/services` incrementally.
// Additional client-safe, isomorphic services (can be imported from the
// client-facing barrel without pulling server-only modules into browser
// bundles). Keep server-only services (payment/subscription/coupon/etc.) out
// of this barrel per the comments above.
export { default as reviewService } from './reviewService';
export { default as searchService } from './searchService';
export { default as categoryService } from './categoryService';
export { default as invoiceService } from './invoiceService';
export { default as authService } from './authService';
export { default as businessPublicService } from './businessPublicService';
export { default as trendingService } from './trendingService';
export { default as paymentsPublicService } from './paymentsPublicService';
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
