/**
 * Business Domain Types
 *
 * Types for business management, verification, and admin operations.
 * Includes business data models, verification states, and API responses.
 */

import { AdminUser } from './admin';

// ============================================================================
// BUSINESS CORE TYPES
// ============================================================================

/**
 * Business verification status enum
 */
export type BusinessVerificationStatus =
  | 'pending'
  | 'verified'
  | 'suspended'
  | 'rejected';

/**
 * Business profile data — the editable fields shown on the profile page.
 * Uses DB column names (shop_name, not name) for direct supabase compatibility.
 */
export type BusinessProfileData = {
  id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_id: string | null;
  interior_images: string[] | null;
  status: BusinessVerificationStatus;
  updated_at: string | null;
};

/**
 * Core business record from database
 */
export type Business = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  interior_images: string[] | null;
  status: BusinessVerificationStatus;
  verification_docs_url: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
};

/**
 * Business with owner profile information (for admin dashboard)
 */
export type AdminBusiness = Business & {
  owner?: AdminUser;
};

/**
 * Business with additional metadata for admin views
 */
export type AdminBusinessWithMeta = AdminBusiness & {
  /** Time since creation in human-readable format */
  createdAgo?: string;
  /** Time since last update in human-readable format */
  updatedAgo?: string;
  /** Owner's full name or email */
  ownerName?: string;
  /** Human-readable status label */
  statusLabel?: string;
  /** Number of branches */
  branchCount?: number;
  /** Number of active deals/coupons */
  activeDealsCount?: number;
  /** Number of total followers/subscribers */
  totalFollowers?: number;
};

// ============================================================================
// BUSINESS FILTER & PAGINATION
// ============================================================================

/**
 * Filters for business list queries
 */
export type BusinessFilters = {
  status?: BusinessVerificationStatus | 'all';
  search?: string; // Search by name or owner email
  sortBy?: 'created' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number; // Pagination: page number (default 1)
  pageSize?: number; // Pagination: items per page (default 10)
};

/**
 * Paginated business response
 */
export type PaginatedBusinessResponse = {
  data: AdminBusinessWithMeta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ============================================================================
// BUSINESS MUTATIONS
// ============================================================================

/**
 * Input for creating a business (business owner only - not admin)
 */
export type CreateBusinessInput = {
  name: string;
  description?: string;
  logo_url?: string;
  interior_images?: string[];
  verification_docs_url?: string[];
};

/**
 * Input for updating a business
 */
export type UpdateBusinessInput = {
  name?: string;
  description?: string;
  logo_url?: string;
  interior_images?: string[];
  verification_docs_url?: string[];
};

/**
 * Admin-specific update (includes status changes)
 */
export type AdminUpdateBusinessInput = UpdateBusinessInput & {
  status?: BusinessVerificationStatus;
};

/**
 * Verification request with reason/notes
 */
export type VerifyBusinessInput = {
  verified: boolean;
  notes?: string; // Optional notes for rejection/suspension
};

// ============================================================================
// API RESPONSES
// ============================================================================

/**
 * Standard response for business operations
 */
export type BusinessActionResponse<T = AdminBusiness> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Input for adding suspension reason
 */
export type SuspendBusinessInput = {
  reason?: string;
};

// ============================================================================
// BUSINESS STATISTICS
// ============================================================================

/**
 * Dashboard statistics for a business
 */
export type BusinessDashboardStats = {
  business_id: string;
  business_name: string;
  total_followers: number;
  total_redemptions: number;
  active_deals: number;
};
