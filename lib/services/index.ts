export { default as userService } from './userService';
export { default as http } from './client';
export { default as productService } from './productService';
export { default as paymentService } from './paymentService';
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
export { default as notificationService } from './notificationService';
export { default as uploadService } from './uploadService';
export { default as analyticsService } from './analyticsService';

// Re-export commonly used types from the legacy browser services so callers
// can migrate imports to `@/services` incrementally.
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
