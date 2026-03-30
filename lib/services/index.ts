export { default as userService } from './userService';
export { default as http } from './client';
export { default as searchService } from './searchService';
export { default as productService } from './productService';
export { default as paymentService } from './paymentService';
export { default as subscriptionService } from './subscriptionService';
export { default as reviewService } from './reviewService';
export { default as ratingService } from './ratingService';
export { default as couponService } from './couponService';
export { default as featuredDealService } from './featuredDealService';
export { default as branchService } from './branchService';
export { default as businessService } from './businessService';
export { default as categoryService } from './categoryService';
export { default as notificationService } from './notificationService';
export { default as uploadService } from './uploadService';
export { default as analyticsService } from './analyticsService';

// Re-export commonly used types from the legacy browser services so callers
// can migrate imports to `@/services` incrementally.
export type { PaginatedResponse } from '@/services/api/paginationService';
export type { AdminCreateUserInput } from '@/lib/types/admin';
export type { UpdateUserInput, AdminUpdateUserInput } from '@/services/api/userService';
export {
  getOffset,
  getTotalPages,
  createPaginatedResponse,
} from '@/services/api/paginationService';
