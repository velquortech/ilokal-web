'use server';

import { createServerSupabaseClient } from '@/supabase/server';
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

    // Get current user session
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
        },
      };
    }

    // Verify user is still active (not suspended or inactive)
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status !== 'active') {
      console.warn(
        `[updateCurrentUserProfileAction] Attempted update by inactive user ${user.id}`,
      );
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Your account is not active',
        },
      };
    }

    // Update profile using shared service
    const updatedUser = await updateUserProfile(user.id, validation.data);

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
