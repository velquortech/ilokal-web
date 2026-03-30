'use server';

import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { User } from '@/lib/types/user';
import {
  UpdateCurrentUserProfileInput,
  updateCurrentUserProfileSchema,
} from '@/lib/validation/auth';
import { updateUserProfile } from '@/lib/api/users/userService';

/**
 * Server Action: Update current user profile
 *
 * Security considerations:
 * - Requires active session (not suspended or inactive)
 * - Validates input with Zod schema
 * - Only allows updating own profile (via session user ID)
 * - Returns type-safe ApiResponse<User>
 * - Uses shared userService for DRY principle (also used by API route)
 *
 * @param data - Profile update data (full_name, phone_number, avatar_url)
 * @returns ApiResponse with updated user or error
 */
export async function updateCurrentUserProfileAction(
  data: UpdateCurrentUserProfileInput,
): Promise<{
  success: boolean;
  data?: User;
  error?: { code: string; message: string };
}> {
  try {
    // Validate input
    const validation = updateCurrentUserProfileSchema.safeParse(data);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message || 'Invalid input',
        },
      };
    }

    // Use centralized auth check
    const auth = await assertAuthorized();
    if (!auth.authorized) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
        },
      };
    }

    // Update profile using server API client (server-only)
    const updatedUser = await updateUserProfile(auth.user.id, validation.data);

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[updateCurrentUserProfileAction] Error:', errorMessage);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update profile',
      },
    };
  }
}
