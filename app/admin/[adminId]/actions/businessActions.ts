/**
 * Business Admin Server Actions
 *
 * Server-side mutations for business management.
 * All actions delegate to /api/admin/businesses routes to avoid duplication.
 * API routes handle authorization, validation, and business logic.
 * Used by admin dashboard forms and UI actions.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { businessFiltersSchema } from '@/lib/validation/business';
import { countBusinessesByStatus } from '@/lib/api/business/businessQuery';
import businessService from '@/lib/services/businessService';
import {
  BusinessActionResponse,
  AdminBusiness,
  PaginatedBusinessResponse,
} from '@/lib/types/business';

// ============================================================================
// AUTHORIZATION CHECK
// ============================================================================

/**
 * Verify current user is admin
 * Reused helper from adminActionHelpers
 */
export async function verifyAdminAuth(): Promise<{
  authorized: boolean;
  error?: string;
}> {
  return verifyCurrentUserIsAdmin();
}

// ============================================================================
// FETCH ACTIONS
// ============================================================================

/**
 * Get all businesses with pagination and filters
 */
export async function getBusinessesAction(
  filters?: Partial<Record<string, string | number>>,
): Promise<PaginatedBusinessResponse | { error: string }> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { error: error || 'Unauthorized' };

    // Validate filters
    const validatedFilters = businessFiltersSchema.parse(filters || {});

    const { data, error: apiError } =
      await businessService.list(validatedFilters);

    if (apiError) {
      return { error: apiError };
    }

    return data || { error: 'No data returned' };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch businesses',
    };
  }
}

/**
 * Get single business by ID
 */
export async function getBusinessAction(
  businessId: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data: business, error: apiError } =
      await businessService.get(businessId);

    if (apiError) {
      return {
        success: false,
        error: apiError,
      };
    }

    return {
      success: true,
      data: business || undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch business',
    };
  }
}

/**
 * Get business count summary by status
 */
export async function getBusinessCountsAction(): Promise<
  { counts: Record<string, number> } | { error: string }
> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { error: error || 'Unauthorized' };

    const { counts, error: countError } = await countBusinessesByStatus();

    if (countError) {
      return { error: countError };
    }

    return { counts };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch counts',
    };
  }
}

// ============================================================================
// VERIFICATION ACTIONS
// ============================================================================

/**
 * Verify a pending business
 */
export async function verifyBusinessAction(
  businessId: string,
  notes?: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data, error: apiError } = await businessService.verify(
      businessId,
      notes,
    );

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to verify business',
    };
  }
}

/**
 * Reject a business
 */
export async function rejectBusinessAction(
  businessId: string,
  reason?: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data, error: apiError } = await businessService.reject(
      businessId,
      reason,
    );

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reject business',
    };
  }
}

// ============================================================================
// SUSPENSION & REACTIVATION ACTIONS
// ============================================================================

/**
 * Suspend a business
 */
export async function suspendBusinessAction(
  businessId: string,
  reason?: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data, error: apiError } = await businessService.suspend(
      businessId,
      reason,
    );

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to suspend business',
    };
  }
}

/**
 * Reactivate a suspended business
 */
export async function reactivateBusinessAction(
  businessId: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data, error: apiError } =
      await businessService.reactivate(businessId);

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to reactivate business',
    };
  }
}

// ============================================================================
// UPDATE ACTIONS
// ============================================================================

/**
 * Update business profile (admin)
 */
export async function updateBusinessAction(
  businessId: string,
  updates: Partial<Record<string, string | number | boolean>>,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { data, error: apiError } = await businessService.update(
      businessId,
      updates,
    );

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page and specific business page
    revalidatePath('/admin/businesses');
    revalidatePath(`/admin/businesses/${businessId}`);

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update business',
    };
  }
}

// ============================================================================
// DELETE ACTIONS
// ============================================================================

/**
 * Archive a business (soft delete, data preserved)
 */
export async function archiveBusinessAction(
  businessId: string,
): Promise<BusinessActionResponse<void>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { error: apiError } = await businessService.archive(businessId);

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to archive business',
    };
  }
}

/**
 * Permanently delete a business (hard delete, irreversible)
 */
export async function deleteBusinessAction(
  businessId: string,
): Promise<BusinessActionResponse<void>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const { error: apiError } =
      await businessService.deletePermanently(businessId);

    if (apiError) {
      return { success: false, error: apiError };
    }

    // Revalidate the businesses page
    revalidatePath('/admin/businesses');

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete business',
    };
  }
}
