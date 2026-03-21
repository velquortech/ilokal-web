/**
 * Centralized Type Export Index
 *
 * Single source of truth for all type imports throughout the codebase
 * Instead of scattered imports, use:
 *
 * ✅ CORRECT:
 * import type { User, CreateUserInput, ApiResponse } from '@/lib/types';
 *
 * ❌ WRONG:
 * import type { User } from '@/lib/types/user';
 * import type { ApiResponse } from '@/lib/types/common';
 */

// Common/Global Types
export type {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  PaginatedResult,
  PaginatedApiResponse,
  ExtractData,
} from './common';

// User Domain Types
export type {
  UserRole,
  Profile,
  User,
  AuthUser,
  DatabaseProfile,
} from './user';

// Business Domain Types
export type {
  Business,
  AdminBusiness,
  BusinessFilters,
  PaginatedBusinessResponse,
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessVerificationStatus,
} from './business';

// Product Domain Types
export type {
  Product,
  Category,
  ProductStatus,
  ProductSortOrder,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  PaginatedProductsResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ProductFilters,
  CategoryFilters,
  ProductError,
} from './product';

// Admin Domain Types
export type {
  AdminUser,
  AdminActionResponse,
  AdminDashboardStats,
  AdminCapabilities,
  AdminContextState,
  AdminUpdateUserInput,
  AdminUserFilters,
  AdminActivityLog,
} from './admin';

// Form Types
export type { SelectFieldConfig, UserFormModalProps } from './forms';

// Middleware Types
// Note: middleware.ts types may be imported as needed

// Phone Input Types
export type { CountryCode } from './phoneInput';

// Database Types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database';
