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
import { createServerSupabaseClient } from '@/supabase/server';
import {
  BusinessActionResponse,
  AdminBusiness,
  PaginatedBusinessResponse,
} from '@/lib/types/business';
import { logActionError } from '@/lib/utils/captureError';

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
    logActionError('getBusinessesAction', err);
    return {
      error: 'Failed to fetch businesses',
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
    logActionError('getBusinessAction', err);
    return {
      success: false,
      error: 'Failed to fetch business',
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
    logActionError('getBusinessCountsAction', err);
    return {
      error: 'Failed to fetch counts',
    };
  }
}

// ============================================================================
// AUDIT / CHANGE HISTORY
// ============================================================================

/**
 * One audit_log row for a business, with the actor's name resolved.
 *
 * Only `table_name = 'businesses'` rows are shown here — the status rows
 * (verification workflow, from 20260526000011) and the taxonomy rows
 * (category / business-type re-classification by the owner, from
 * 20260816000000). Reads are admin-only: the audit_log RLS policy restricts
 * SELECT to admins, and `verifyCurrentUserIsAdmin` gates this action too.
 */
export interface BusinessAuditEntry {
  id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_at: string;
  performed_by_name: string | null;
}

/**
 * Fetch the change history for one business, newest first.
 */
export async function getBusinessAuditLogAction(
  businessId: string,
): Promise<
  | { success: true; data: BusinessAuditEntry[] }
  | { success: false; error: string }
> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: error || 'Unauthorized' };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error: apiError } = await supabase
      .from('audit_log')
      .select(
        'id, old_value, new_value, performed_at, profiles!audit_log_performed_by_fkey(full_name, email)',
      )
      .eq('table_name', 'businesses')
      .eq('record_id', businessId)
      .order('performed_at', { ascending: false })
      .limit(50);

    if (apiError) {
      return { success: false, error: apiError.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => {
        const profile = row.profiles as {
          full_name?: string | null;
          email?: string | null;
        } | null;
        return {
          id: row.id,
          old_value: (row.old_value ?? null) as Record<string, unknown> | null,
          new_value: (row.new_value ?? null) as Record<string, unknown> | null,
          performed_at: row.performed_at as string,
          performed_by_name: profile?.full_name ?? profile?.email ?? null,
        };
      }),
    };
  } catch (err) {
    logActionError('getBusinessAuditLogAction', err);
    return { success: false, error: 'Failed to fetch change history' };
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true, data };
  } catch (err) {
    logActionError('verifyBusinessAction', err);
    return {
      success: false,
      error: 'Failed to verify business',
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true, data };
  } catch (err) {
    logActionError('rejectBusinessAction', err);
    return {
      success: false,
      error: 'Failed to reject business',
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true, data };
  } catch (err) {
    logActionError('suspendBusinessAction', err);
    return {
      success: false,
      error: 'Failed to suspend business',
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true, data };
  } catch (err) {
    logActionError('reactivateBusinessAction', err);
    return {
      success: false,
      error: 'Failed to reactivate business',
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

    // Revalidate the whole dashboard: the routes are /admin/[adminId]/...
    // (list and detail), which one layout revalidate covers.
    revalidatePath('/admin', 'layout');

    return { success: true, data };
  } catch (err) {
    logActionError('updateBusinessAction', err);
    return {
      success: false,
      error: 'Failed to update business',
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true };
  } catch (err) {
    logActionError('archiveBusinessAction', err);
    return {
      success: false,
      error: 'Failed to archive business',
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

    // Revalidate the admin dashboard. The route is /admin/[adminId]/businesses
    // — a literal '/admin/businesses' revalidates nothing, so the layout
    // revalidate is the admin convention (same as userActions).
    revalidatePath('/admin', 'layout');

    return { success: true };
  } catch (err) {
    logActionError('deleteBusinessAction', err);
    return {
      success: false,
      error: 'Failed to delete business',
    };
  }
}
