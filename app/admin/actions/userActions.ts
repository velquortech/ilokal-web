'use server';

import { revalidatePath } from 'next/cache';
import type { AdminCreateUserInput } from '@/lib/types/admin';
import { AdminActionResponse, AdminUser } from '@/lib/types/admin';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import {
  createAdmin,
  createConsumer,
  createBusinessOwner,
  updateUser,
  updateUserStatus,
  deleteUser,
  restoreUser,
} from '@/lib/api/admin/userAPIClient';
import { AdminUpdateUserInput } from '@/lib/api/admin/adminActionHelpers';

// Re-export for backward compatibility
export type ActionState<T = unknown> = AdminActionResponse<T>;

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

export async function createAdminAction(
  formData: AdminCreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await createAdmin(formData);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin',
    };
  }
}

export async function updateAdminAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await updateUser(id, changes);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin',
    };
  }
}

export async function deleteAdminAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { error } = await deleteUser(id);
    if (error) return { success: false, error };

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete admin',
    };
  }
}

export async function updateAdminStatusAction(
  id: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await updateUserStatus(id, status);
    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update admin status',
    };
  }
}

// ============================================================================
// CONSUMER MUTATIONS
// ============================================================================

export async function createConsumerAction(
  formData: AdminCreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await createConsumer(formData);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create consumer',
    };
  }
}

export async function updateConsumerAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await updateUser(id, changes);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update consumer',
    };
  }
}

export async function deleteConsumerAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { error } = await deleteUser(id);
    if (error) return { success: false, error };

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete consumer',
    };
  }
}

// ============================================================================
// BUSINESS OWNER MUTATIONS
// ============================================================================

export async function createBusinessOwnerAction(
  formData: AdminCreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await createBusinessOwner(formData);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create business owner',
    };
  }
}

export async function updateBusinessOwnerAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await updateUser(id, changes);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update business owner',
    };
  }
}

export async function deleteBusinessOwnerAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { error } = await deleteUser(id);
    if (error) return { success: false, error };

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete business owner',
    };
  }
}

// ============================================================================
// RESTORE/RECOVERY ACTIONS
// ============================================================================

/**
 * Restore an archived user (soft delete recovery)
 * Re-activates the user and allows them to login again
 */
export async function restoreUserAction(
  id: string,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { data, error } = await restoreUser(id);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore user',
    };
  }
}
