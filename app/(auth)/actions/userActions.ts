'use server';

import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { User } from '@/lib/types/user';
import {
  UpdateCurrentUserProfileInput,
  updateCurrentUserProfileSchema,
} from '@/lib/validation/auth';
import { updateUserProfile } from '@/lib/api/users/userService';
import { createServerSupabaseClient } from '@/supabase/server';
import { extractStoragePath } from '@/lib/utils/storage';

export async function updateCurrentUserProfileAction(
  data: UpdateCurrentUserProfileInput,
): Promise<{
  success: boolean;
  data?: User;
  error?: { code: string; message: string };
}> {
  try {
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

    // Fetch current avatar_url before updating so we can clean up storage
    const supabase = await createServerSupabaseClient();
    const { data: current } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', auth.user.id)
      .single();

    const updatedUser = await updateUserProfile(auth.user.id, validation.data);

    // Delete old avatar from storage after a successful update
    if (
      current?.avatar_url &&
      validation.data.avatar_url !== undefined &&
      validation.data.avatar_url !== current.avatar_url
    ) {
      const oldPath = extractStoragePath(current.avatar_url, 'avatars');
      if (oldPath) {
        supabase.storage
          .from('avatars')
          .remove([oldPath])
          .catch(() => {});
      }
    }

    return { success: true, data: updatedUser };
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
