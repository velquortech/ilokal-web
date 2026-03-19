'use server';

import { revalidatePath } from 'next/cache';
import { CreateUserInput } from '@/services/api/userService';
import { AdminActionResponse, AdminUser } from '@/lib/types/admin';
import {
  AdminUpdateUserInput,
  verifyCurrentUserIsAdmin,
  createAuthUser,
  deleteAuthUser,
  updateAuthUser,
  buildProfileUpdateData,
  createProfile,
  updateProfile,
  updateProfileStatus,
} from '@/lib/api/adminActionHelpers';

// Re-export for backward compatibility
export type ActionState<T = unknown> = AdminActionResponse<T>;

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

export async function createAdminAction(
  formData: CreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { userId, error: userError } = await createAuthUser(
      formData.email,
      formData.password,
    );
    if (userError || !userId) {
      return {
        success: false,
        error: userError || 'Failed to create auth user',
      };
    }

    const formDataWithRole = { ...formData, role: 'admin' as const };
    const { profile, error: profileError } = await createProfile(
      userId,
      formDataWithRole,
    );
    if (profileError || !profile) {
      await deleteAuthUser(userId);
      return {
        success: false,
        error: profileError || 'Failed to create profile',
      };
    }

    revalidatePath('/admin');
    return { success: true, data: profile };
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

    const updateData = buildProfileUpdateData(changes);
    const { profile, error: profileError } = await updateProfile(
      id,
      updateData,
    );
    if (profileError || !profile) {
      return {
        success: false,
        error: profileError || 'Failed to update profile',
      };
    }

    if ('email' in changes || 'password' in changes) {
      const { error: authError } = await updateAuthUser(
        id,
        changes.email,
        changes.password,
      );
      if (authError) return { success: false, error: authError };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
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

    const { error } = await deleteAuthUser(id);
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

    const { profile, error } = await updateProfileStatus(id, status);
    if (error || !profile) {
      return { success: false, error: error || 'Failed to update status' };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
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
  formData: CreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { userId, error: userError } = await createAuthUser(
      formData.email,
      formData.password,
    );
    if (userError || !userId) {
      return {
        success: false,
        error: userError || 'Failed to create auth user',
      };
    }

    const formDataWithRole = { ...formData, role: 'app_user' as const };
    const { profile, error: profileError } = await createProfile(
      userId,
      formDataWithRole,
    );
    if (profileError || !profile) {
      await deleteAuthUser(userId);
      return {
        success: false,
        error: profileError || 'Failed to create profile',
      };
    }

    revalidatePath('/admin');
    return { success: true, data: profile };
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

    const updateData = buildProfileUpdateData(changes);
    const { profile, error: profileError } = await updateProfile(
      id,
      updateData,
    );
    if (profileError || !profile) {
      return {
        success: false,
        error: profileError || 'Failed to update profile',
      };
    }

    if ('email' in changes || 'password' in changes) {
      const { error: authError } = await updateAuthUser(
        id,
        changes.email,
        changes.password,
      );
      if (authError) return { success: false, error: authError };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
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

    const { error } = await deleteAuthUser(id);
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
  formData: CreateUserInput,
): Promise<AdminActionResponse<AdminUser>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) return { success: false, error: authError };

    const { userId, error: userError } = await createAuthUser(
      formData.email,
      formData.password,
    );
    if (userError || !userId) {
      return {
        success: false,
        error: userError || 'Failed to create auth user',
      };
    }

    const formDataWithRole = { ...formData, role: 'business_owner' as const };
    const { profile, error: profileError } = await createProfile(
      userId,
      formDataWithRole,
    );
    if (profileError || !profile) {
      await deleteAuthUser(userId);
      return {
        success: false,
        error: profileError || 'Failed to create profile',
      };
    }

    revalidatePath('/admin');
    return { success: true, data: profile };
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

    const updateData = buildProfileUpdateData(changes);
    const { profile, error: profileError } = await updateProfile(
      id,
      updateData,
    );
    if (profileError || !profile) {
      return {
        success: false,
        error: profileError || 'Failed to update profile',
      };
    }

    if ('email' in changes || 'password' in changes) {
      const { error: authError } = await updateAuthUser(
        id,
        changes.email,
        changes.password,
      );
      if (authError) return { success: false, error: authError };
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/${id}`);
    return { success: true, data: profile };
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

    const { error } = await deleteAuthUser(id);
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
