/**
 * Business API Client
 *
 * Shared interface for business operations.
 * Calls business service and query functions directly (no HTTP/fetch).
 * Used by both server actions and API routes to avoid code duplication.
 * Follows the DRY pattern established in userService.
 */

import {
  verifyBusiness as verifyBusinessService,
  rejectBusiness as rejectBusinessService,
  suspendBusiness as suspendBusinessService,
  reactivateBusiness as reactivateBusinessService,
  updateAdminBusiness,
  archiveBusiness as archiveBusinessService,
  permanentlyDeleteBusiness,
} from './businessService';
import {
  getBusinessById,
  getBusinessesPaginated,
  countBusinessesByStatus,
} from './businessQuery';
import { AdminBusiness, PaginatedBusinessResponse } from '@/lib/types/business';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Standard operation result format
 * Matches the pattern used in userAPIClient
 */
export interface OperationResult<T = unknown> {
  data?: T;
  error?: string;
}

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Get paginated businesses with filters
 * Calls service layer directly (no HTTP)
 */
export async function getBusinessesList(
  filters: Partial<Record<string, string | number>> = {},
): Promise<OperationResult<PaginatedBusinessResponse>> {
  try {
    const { data, total, error } = await getBusinessesPaginated(filters);

    if (error) {
      return { error };
    }

    const { counts } = await countBusinessesByStatus();
    const page = (filters.page as number) || 1;
    const pageSize = (filters.pageSize as number) || 10;

    return {
      data: {
        businesses: data,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        counts: counts || {},
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch businesses',
    };
  }
}

/**
 * Get single business by ID
 * Calls service layer directly (no HTTP)
 */
export async function getBusiness(
  businessId: string,
): Promise<OperationResult<AdminBusiness>> {
  try {
    const { business, error } = await getBusinessById(businessId);

    if (error) {
      return { error };
    }

    return { data: business || undefined };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch business',
    };
  }
}

// ============================================================================
// VERIFICATION & STATUS ACTIONS
// ============================================================================

/**
 * Verify a business
 * Calls service layer directly (no HTTP)
 */
export async function verifyBusiness(
  businessId: string,
  notes?: string,
): Promise<OperationResult<AdminBusiness>> {
  const response = await verifyBusinessService(businessId, notes);

  if (!response.success) {
    return { error: response.error };
  }

  return { data: response.data };
}

/**
 * Reject a business
 * Calls service layer directly (no HTTP)
 */
export async function rejectBusiness(
  businessId: string,
  reason?: string,
): Promise<OperationResult<AdminBusiness>> {
  const response = await rejectBusinessService(businessId, reason);

  if (!response.success) {
    return { error: response.error };
  }

  return { data: response.data };
}

/**
 * Suspend a business
 * Calls service layer directly (no HTTP)
 */
export async function suspendBusiness(
  businessId: string,
  reason?: string,
): Promise<OperationResult<AdminBusiness>> {
  const response = await suspendBusinessService(businessId, reason);

  if (!response.success) {
    return { error: response.error };
  }

  return { data: response.data };
}

/**
 * Reactivate a suspended business
 * Calls service layer directly (no HTTP)
 */
export async function reactivateBusiness(
  businessId: string,
): Promise<OperationResult<AdminBusiness>> {
  const response = await reactivateBusinessService(businessId);

  if (!response.success) {
    return { error: response.error };
  }

  return { data: response.data };
}

// ============================================================================
// UPDATE & DELETE OPERATIONS
// ============================================================================

/**
 * Update business
 * Calls service layer directly (no HTTP)
 */
export async function updateBusiness(
  businessId: string,
  updates: Partial<Record<string, string | number | boolean>>,
): Promise<OperationResult<AdminBusiness>> {
  const response = await updateAdminBusiness(businessId, updates);

  if (!response.success) {
    return { error: response.error };
  }

  return { data: response.data };
}

/**
 * Archive a business (soft delete)
 * Calls service layer directly (no HTTP)
 */
export async function archiveBusiness(
  businessId: string,
): Promise<OperationResult<void>> {
  const response = await archiveBusinessService(businessId);

  if (!response.success) {
    return { error: response.error };
  }

  return {};
}

/**
 * Permanently delete a business (hard delete)
 * Calls service layer directly (no HTTP)
 */
export async function deleteBusinessPermanently(
  businessId: string,
): Promise<OperationResult<void>> {
  const response = await permanentlyDeleteBusiness(businessId);

  if (!response.success) {
    return { error: response.error };
  }

  return {};
}
