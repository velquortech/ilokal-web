/**
 * Business Service Layer
 *
 * Business logic and mutations for business management.
 * Coordinates queries, validations, and side effects.
 * Handles verification, rejection, suspension, and reactivation workflows.
 */

import {
  getBusinessById,
  updateBusinessStatus,
  updateBusinessProfile,
  archiveBusinessById,
  deleteBusinessById,
} from './businessQuery';
import {
  AdminUpdateBusinessInput,
  BusinessActionResponse,
  AdminBusiness,
  Business,
} from '@/lib/types/business';

// ============================================================================
// VERIFICATION WORKFLOW
// ============================================================================

/**
 * Verify a business (change status to 'verified')
 * Automatically grants beta access subscription (handled by DB trigger)
 */
export async function verifyBusiness(
  businessId: string,
  _notes?: string, // For audit trail - not used yet
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    // Update business status to verified
    const { error } = await updateBusinessStatus(businessId, 'verified');

    if (error) {
      return {
        success: false,
        error: `Failed to verify business: ${error}`,
      };
    }

    // Fetch with owner info
    const { business: fullBusiness, error: fetchError } =
      await getBusinessById(businessId);

    if (fetchError) {
      return {
        success: false,
        error: `Business verified but failed to fetch details: ${fetchError}`,
      };
    }

    return {
      success: true,
      data: fullBusiness || undefined,
      message:
        'Business verified successfully. Beta access granted automatically.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to verify business',
    };
  }
}

/**
 * Reject a business (change status to 'rejected')
 */
export async function rejectBusiness(
  businessId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason?: string, // For audit trail
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { error } = await updateBusinessStatus(businessId, 'rejected');

    if (error) {
      return {
        success: false,
        error: `Failed to reject business: ${error}`,
      };
    }

    const { business: fullBusiness, error: fetchError } =
      await getBusinessById(businessId);

    if (fetchError) {
      return {
        success: false,
        error: `Business rejected but failed to fetch details: ${fetchError}`,
      };
    }

    return {
      success: true,
      data: fullBusiness || undefined,
      message: 'Business rejected successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reject business',
    };
  }
}

// ============================================================================
// SUSPENSION & REACTIVATION
// ============================================================================

/**
 * Suspend a business (change status to 'suspended')
 * Prevents access to features while keeping data intact
 */
export async function suspendBusiness(
  businessId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reason?: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    const { error } = await updateBusinessStatus(businessId, 'suspended');

    if (error) {
      return {
        success: false,
        error: `Failed to suspend business: ${error}`,
      };
    }

    const { business: fullBusiness, error: fetchError } =
      await getBusinessById(businessId);

    if (fetchError) {
      return {
        success: false,
        error: `Business suspended but failed to fetch details: ${fetchError}`,
      };
    }

    return {
      success: true,
      data: fullBusiness || undefined,
      message: 'Business suspended successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to suspend business',
    };
  }
}

/**
 * Reactivate a suspended business (change status back to 'verified')
 */
export async function reactivateBusiness(
  businessId: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    // Get current business to verify it's suspended
    const { business: current, error: fetchError } =
      await getBusinessById(businessId);

    if (fetchError || !current) {
      return {
        success: false,
        error: fetchError || 'Business not found',
      };
    }

    if (current.status !== 'suspended') {
      return {
        success: false,
        error: `Cannot reactivate a ${current.status} business`,
      };
    }

    // Reactivate to verified status
    const { error } = await updateBusinessStatus(businessId, 'verified');

    if (error) {
      return {
        success: false,
        error: `Failed to reactivate business: ${error}`,
      };
    }

    const { business: fullBusiness, error: fetchError2 } =
      await getBusinessById(businessId);

    if (fetchError2) {
      return {
        success: false,
        error: `Business reactivated but failed to fetch details: ${fetchError2}`,
      };
    }

    return {
      success: true,
      data: fullBusiness || undefined,
      message: 'Business reactivated successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to reactivate business',
    };
  }
}

// ============================================================================
// UPDATE & PROFILE OPERATIONS
// ============================================================================

/**
 * Update business profile (admin can update all fields)
 */
export async function updateAdminBusiness(
  businessId: string,
  updates: AdminUpdateBusinessInput,
): Promise<BusinessActionResponse<AdminBusiness>> {
  try {
    // Separate status update from profile updates
    const { status, ...profileUpdates } = updates;

    // Update profile data if provided
    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await updateBusinessProfile(
        businessId,
        profileUpdates as Partial<Business>,
      );

      if (updateError) {
        return {
          success: false,
          error: `Failed to update business profile: ${updateError}`,
        };
      }
    }

    // Update status if provided
    if (status) {
      const { error: statusError } = await updateBusinessStatus(
        businessId,
        status,
      );

      if (statusError) {
        return {
          success: false,
          error: `Failed to update business status: ${statusError}`,
        };
      }
    }

    // Fetch updated business
    const { business, error: fetchError } = await getBusinessById(businessId);

    if (fetchError) {
      return {
        success: false,
        error: `Business updated but failed to fetch details: ${fetchError}`,
      };
    }

    return {
      success: true,
      data: business || undefined,
      message: 'Business updated successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update business',
    };
  }
}

// ============================================================================
// ARCHIVE & DELETE OPERATIONS
// ============================================================================

/**
 * Archive a business (soft delete)
 * Data is preserved but business is hidden from public/user views
 */
export async function archiveBusiness(
  businessId: string,
): Promise<BusinessActionResponse<void>> {
  try {
    const { error } = await archiveBusinessById(businessId);

    if (error) {
      return {
        success: false,
        error: `Failed to archive business: ${error}`,
      };
    }

    return {
      success: true,
      message: 'Business archived successfully.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to archive business',
    };
  }
}

/**
 * Permanently delete a business (hard delete)
 * WARNING: This cannot be undone
 */
export async function permanentlyDeleteBusiness(
  businessId: string,
): Promise<BusinessActionResponse<void>> {
  try {
    // Verify business exists first
    const { business, error: fetchError } = await getBusinessById(businessId);

    if (fetchError || !business) {
      return {
        success: false,
        error: fetchError || 'Business not found',
      };
    }

    // Perform deletion
    const { error } = await deleteBusinessById(businessId);

    if (error) {
      return {
        success: false,
        error: `Failed to delete business: ${error}`,
      };
    }

    return {
      success: true,
      message: 'Business permanently deleted.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete business',
    };
  }
}
