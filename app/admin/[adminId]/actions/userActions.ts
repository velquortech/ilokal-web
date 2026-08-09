'use server';

import { logActionError } from '@/lib/utils/captureError';

import { revalidatePath } from 'next/cache';
import type { AdminCreateUserInput } from '@/lib/types/admin';
import { AdminActionResponse, AdminUser } from '@/lib/types/admin';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import adminService from '@/lib/services/adminService';
import { AdminUpdateUserInput } from '@/lib/api/admin/adminActionHelpers';

function normalizeError(e?: unknown): string | undefined {
  if (!e) return undefined;
  return typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
}

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
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.createAdmin(formData);

    if (error) {
      return { success: false, error: normalizeError(error) };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('createAdminAction', error);
    return {
      success: false,
      error: 'Failed to create admin',
    };
  }
}

export async function updateAdminAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.updateUser(id, changes);

    if (error) {
      return { success: false, error: normalizeError(error) };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('updateAdminAction', error);
    return {
      success: false,
      error: 'Failed to update admin',
    };
  }
}

export async function deleteAdminAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { error } = await adminService.deleteUser(id);
    if (error) return { success: false, error: normalizeError(error) };

    revalidatePath('/admin', 'layout');
    return { success: true };
  } catch (error) {
    logActionError('deleteAdminAction', error);
    return {
      success: false,
      error: 'Failed to delete admin',
    };
  }
}

export async function updateAdminStatusAction(
  id: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.updateUserStatus(id, status);
    if (error) {
      return { success: false, error: normalizeError(error) };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('updateAdminStatusAction', error);
    return {
      success: false,
      error: 'Failed to update admin status',
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
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.createConsumer(formData);

    if (error) {
      return { success: false, error: normalizeError(error) };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('createConsumerAction', error);
    return {
      success: false,
      error: 'Failed to create consumer',
    };
  }
}

export async function updateConsumerAction(
  id: string,
  changes: AdminUpdateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.updateUser(id, changes);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('updateConsumerAction', error);
    return {
      success: false,
      error: 'Failed to update consumer',
    };
  }
}

export async function deleteConsumerAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { error } = await adminService.deleteUser(id);
    if (error) return { success: false, error: normalizeError(error) };

    revalidatePath('/admin', 'layout');
    return { success: true };
  } catch (error) {
    logActionError('deleteConsumerAction', error);
    return {
      success: false,
      error: 'Failed to delete consumer',
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
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { data, error } = await adminService.createBusinessOwner(formData);

    if (error) {
      return { success: false, error: normalizeError(error) };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('createBusinessOwnerAction', error);
    return {
      success: false,
      error: 'Failed to create business owner',
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

    const { data, error } = await adminService.updateUser(id, changes);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('updateBusinessOwnerAction', error);
    return {
      success: false,
      error: 'Failed to update business owner',
    };
  }
}

export async function deleteBusinessOwnerAction(
  id: string,
): Promise<AdminActionResponse> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized)
      return { success: false, error: normalizeError(authError) };

    const { error } = await adminService.deleteUser(id);
    if (error) return { success: false, error: normalizeError(error) };

    revalidatePath('/admin', 'layout');
    return { success: true };
  } catch (error) {
    logActionError('deleteBusinessOwnerAction', error);
    return {
      success: false,
      error: 'Failed to delete business owner',
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

    const { data, error } = await adminService.restoreUser(id);

    if (error) {
      return { success: false, error };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data };
  } catch (error) {
    logActionError('restoreUserAction', error);
    return {
      success: false,
      error: 'Failed to restore user',
    };
  }
}
