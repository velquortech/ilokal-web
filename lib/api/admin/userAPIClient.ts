/**
 * User API Client
 *
 * Client for server-side operations in user management.
 * Wraps user service helpers to provide a consistent interface.
 * Used by server actions to avoid code duplication.
 */

import { AdminUser } from '@/lib/types/admin';
import {
  createAuthUser,
  archiveUser,
  unarchiveUser,
  updateAuthUser,
  buildProfileUpdateData,
  createProfile,
  updateProfile,
  updateProfileStatus,
} from '@/lib/api/admin/adminActionHelpers';
import type { AdminCreateUserInput } from '@/lib/types/admin';
import { AdminUpdateUserInput } from '@/lib/api/admin/adminActionHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface UserOperationResult<T = unknown> {
  data?: T;
  error?: string;
}

export type UserRole = 'admin' | 'app_user' | 'business_owner';

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a user with specified role
 */
export async function createUser(
  formData: AdminCreateUserInput,
  role: UserRole,
): Promise<UserOperationResult<AdminUser>> {
  try {
    // Create auth user
    const { userId, error: userError } = await createAuthUser(
      formData.email,
      formData.password,
    );

    if (userError || !userId) {
      return {
        error: userError || 'Failed to create auth user',
      };
    }

    // Create profile
    const formDataWithRole = { ...formData, role };
    const { profile, error: profileError } = await createProfile(
      userId,
      formDataWithRole,
    );

    if (profileError || !profile) {
      // Cleanup on failure
      await archiveUser(userId);
      return {
        error: profileError || 'Failed to create profile',
      };
    }

    return { data: profile };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
}

/**
 * Create an admin user
 */
export async function createAdmin(
  formData: AdminCreateUserInput,
): Promise<UserOperationResult<AdminUser>> {
  return createUser(formData, 'admin');
}

/**
 * Create a consumer (app_user)
 */
export async function createConsumer(
  formData: AdminCreateUserInput,
): Promise<UserOperationResult<AdminUser>> {
  return createUser(formData, 'app_user');
}

/**
 * Create a business owner
 */
export async function createBusinessOwner(
  formData: AdminCreateUserInput,
): Promise<UserOperationResult<AdminUser>> {
  return createUser(formData, 'business_owner');
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update user profile data
 */
export async function updateUserProfile(
  userId: string,
  changes: AdminUpdateUserInput,
): Promise<UserOperationResult<AdminUser>> {
  try {
    const updateData = buildProfileUpdateData(changes);
    const { profile, error: profileError } = await updateProfile(
      userId,
      updateData,
    );

    if (profileError || !profile) {
      return {
        error: profileError || 'Failed to update profile',
      };
    }

    return { data: profile };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

/**
 * Update user auth credentials
 */
export async function updateUserAuth(
  userId: string,
  email?: string,
  password?: string,
): Promise<UserOperationResult<void>> {
  try {
    const { error } = await updateAuthUser(userId, email, password);

    if (error) {
      return { error };
    }

    return { data: undefined };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update auth',
    };
  }
}

/**
 * Update user and auth together
 */
export async function updateUser(
  userId: string,
  changes: AdminUpdateUserInput,
): Promise<UserOperationResult<AdminUser>> {
  try {
    // Update profile first
    const profileResult = await updateUserProfile(userId, changes);

    if (profileResult.error) {
      return profileResult;
    }

    // Update auth if needed
    if ('email' in changes || 'password' in changes) {
      const authResult = await updateUserAuth(
        userId,
        changes.email,
        changes.password,
      );

      if (authResult.error) {
        return { error: authResult.error };
      }
    }

    return profileResult;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

/**
 * Update user status
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<UserOperationResult<AdminUser>> {
  try {
    const { profile, error } = await updateProfileStatus(userId, status);

    if (error || !profile) {
      return {
        error: error || 'Failed to update status',
      };
    }

    return { data: profile };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a user (soft delete via archived_at)
 * Marks the user account as archived instead of permanently deleting
 */
export async function deleteUser(
  userId: string,
): Promise<UserOperationResult<void>> {
  try {
    const { error } = await archiveUser(userId);

    if (error) {
      return { error };
    }

    return { data: undefined };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

/**
 * Restore an archived user
 * Clears archived_at and sets status back to 'active'
 */
export async function restoreUser(
  userId: string,
): Promise<UserOperationResult<AdminUser>> {
  try {
    const { error } = await unarchiveUser(userId);

    if (error) {
      return { error };
    }

    // Re-fetch the updated profile
    const updateResult = await updateUserStatus(userId, 'active');
    return updateResult;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to restore user',
    };
  }
}
