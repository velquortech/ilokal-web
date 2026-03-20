/**
 * Admin Domain Types
 *
 * Specialized types for admin operations and dashboards.
 * Builds on base user types but adds admin-specific concerns:
 * - Privacy (no sensitive fields)
 * - Mutation responses
 * - Admin filters and pagination
 * - Dashboard analytics
 *
 * SEPARATION OF CONCERNS:
 * - user.ts: Core user/profile types
 * - admin.ts: Admin-only views and operations
 * - business.ts: Business owner types (create later)
 */

import { Profile, UserRole } from './user';
import { PaginatedResponse } from '@/services/api/paginationService';

// ============================================================================
// ADMIN USER REPRESENTATION
// ============================================================================

/**
 * Admin view of a user (no sensitive fields like password_hash)
 * Safe to return from API endpoints
 */
export type AdminUser = Pick<
  Profile,
  | 'id'
  | 'email'
  | 'full_name'
  | 'phone_number'
  | 'role'
  | 'status'
  | 'avatar_url'
  | 'created_at'
  | 'updated_at'
>;

/**
 * Admin user with additional metadata
 */
export type AdminUserWithMeta = AdminUser & {
  /** Time since creation in human-readable format */
  createdAgo?: string;
  /** Time since last update in human-readable format */
  updatedAgo?: string;
  /** Display name (full_name or email fallback) */
  displayName: string;
};

/**
 * User role specifically for admin context
 * Excludes sensitive values
 */
export type AdminUserRole = Exclude<UserRole, never>; // All roles visible to admins

/**
 * User status values visible in admin interface
 */
export type AdminUserStatus = 'active' | 'inactive' | 'suspended';

/**
 * Status filter options including "all" for filtering
 */
export type AdminStatusFilter = 'all' | AdminUserStatus;

/**
 * Sort order enum for admin lists
 */
export type AdminSortOrder = 'latest' | 'oldest';

/**
 * Filter state for admin user lists and tables
 * Single source of truth for pagination and filtering
 */
export interface AdminTabFilterState {
  page: number;
  searchQuery: string;
  statusFilter: AdminStatusFilter;
  sortOrder: AdminSortOrder;
}

// ============================================================================
// ADMIN MUTATIONS & ACTIONS
// ============================================================================

/**
 * Input for creating a user via admin interface
 */
export interface AdminCreateUserInput {
  email: string;
  full_name: string;
  password: string;
  phone_number?: string;
  avatar_url?: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
}

/**
 * Input for updating a user via admin interface
 */
export interface AdminUpdateUserInput {
  email?: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  status?: AdminUserStatus;
}

/**
 * Response from admin mutations
 */
export interface AdminActionResponse<T = AdminUser> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Bulk response for multiple operations
 */
export interface AdminBulkActionResponse<T = AdminUser> {
  success: boolean;
  results: AdminActionResponse<T>[];
  successCount: number;
  failureCount: number;
}

// ============================================================================
// ADMIN FILTERS & PAGINATION
// ============================================================================

/**
 * Admin filter options for user tables
 */
export interface AdminUserFilters {
  searchQuery?: string;
  statusFilter?: 'all' | AdminUserStatus;
  roleFilter?: 'all' | AdminUserRole;
  sortOrder?: 'latest' | 'oldest';
  dateRange?: {
    from: string; // ISO date
    to: string; // ISO date
  };
}

/**
 * Pagination options for admin tables
 */
export interface AdminPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'email' | 'full_name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Combined query options
 */
export interface AdminQueryOptions
  extends Omit<AdminUserFilters, 'sortOrder'>, AdminPaginationOptions {}

// ============================================================================
// ADMIN RESPONSES
// ============================================================================

/**
 * Paginated admin user response
 */
export type AdminUsersPaginatedResponse = PaginatedResponse<AdminUserWithMeta>;

/**
 * Admin dashboard user counts
 */
export interface AdminUserCounts {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: {
    admin: number;
    business_owner: number;
    app_user: number;
  };
}

/**
 * Admin dashboard statistics
 */
export interface AdminDashboardStats {
  userCounts: AdminUserCounts;
  recentUsers: AdminUserWithMeta[];
  recentActivity: AdminActivityLog[];
}

/**
 * Activity log for auditing
 */
export interface AdminActivityLog {
  id: string;
  adminId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN_FAILED';
  targetId: string;
  targetType: 'user' | 'business' | 'coupon' | 'product';
  changes?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// ADMIN TABLE COLUMNS
// ============================================================================

/**
 * Column definition for admin tables
 */
export interface AdminTableColumn<T = AdminUser> {
  id: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Admin users table column definitions
 */
export const ADMIN_USER_TABLE_COLUMNS: AdminTableColumn<AdminUser>[] = [
  {
    id: 'email',
    label: 'Email',
    sortable: true,
    filterable: true,
    width: '25%',
  },
  {
    id: 'full_name',
    label: 'Full Name',
    sortable: true,
    filterable: true,
    width: '20%',
  },
  {
    id: 'role',
    label: 'Role',
    sortable: true,
    filterable: true,
    width: '15%',
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    width: '12%',
  },
  {
    id: 'created_at',
    label: 'Created',
    sortable: true,
    align: 'right',
    width: '15%',
  },
  {
    id: 'updated_at',
    label: 'Updated',
    sortable: true,
    align: 'right',
    width: '13%',
  },
];

// ============================================================================
// ADMIN FORM TYPES
// ============================================================================

/**
 * Admin user form field configuration
 */
export interface AdminUserFormField {
  name: keyof AdminCreateUserInput | keyof AdminUpdateUserInput;
  label: string;
  placeholder?: string;
  type: 'email' | 'text' | 'password' | 'tel' | 'select' | 'textarea';
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
  options?: Array<{ value: string; label: string }>;
  showFor?: 'create' | 'update' | 'both';
}

/**
 * Admin form state
 */
export interface AdminFormState {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  message?: string;
}

// ============================================================================
// ADMIN PERMISSIONS & RBAC
// ============================================================================

/**
 * Admin capabilities based on role
 */
export interface AdminCapabilities {
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canSuspendUsers: boolean;
  canManageAdmins: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
}

/**
 * Role-based capabilities mapping
 */
export const ROLE_CAPABILITIES: Record<AdminUserRole, AdminCapabilities> = {
  admin: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canSuspendUsers: true,
    canManageAdmins: true,
    canViewAnalytics: true,
    canExportData: true,
  },
  business_owner: {
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canSuspendUsers: false,
    canManageAdmins: false,
    canViewAnalytics: false,
    canExportData: false,
  },
  app_user: {
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canSuspendUsers: false,
    canManageAdmins: false,
    canViewAnalytics: false,
    canExportData: false,
  },
};

// ============================================================================
// ADMIN CONTEXT PROVIDERS
// ============================================================================

/**
 * Admin context state
 */
export interface AdminContextState {
  currentAdmin: AdminUser | null;
  capabilities: AdminCapabilities;
  isLoading: boolean;
  error: string | null;
}

/**
 * Admin context actions
 */
export interface AdminContextActions {
  setCurrentAdmin: (admin: AdminUser | null) => void;
  checkPermission: (capability: keyof AdminCapabilities) => boolean;
  setError: (error: string | null) => void;
}
