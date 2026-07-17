'use server';

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  createServerSupabaseClient,
  createServerAdminClient,
} from '@/supabase/server';
import type {
  ApiResponse,
  ApiError,
  BusinessSettings,
  NotificationPreferences,
} from '@/lib/types';
import {
  changePasswordSchema,
  changeEmailSchema,
  updateNotificationPreferencesSchema,
  updateBusinessSettingsSchema,
  deactivateBusinessSchema,
  type ChangePasswordInput,
  type ChangeEmailInput,
  type UpdateNotificationPreferencesInput,
  type UpdateBusinessSettingsInput,
  type DeactivateBusinessInput,
} from '@/lib/validation/settings';
import * as settingsQuery from '@/lib/api/settings/settingsQuery';
import { businessSettingsPath, businessPath } from '@/config/routeConfig';

export async function changePasswordAction(
  businessId: string,
  data: ChangePasswordInput,
): Promise<ApiResponse<null>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      },
    };
  }

  const supabase = await createServerSupabaseClient();

  // Re-authenticate with current password to verify identity
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Could not verify current user',
      },
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    return {
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    };
  }

  return { success: true, data: null };
}

export async function changeEmailAction(
  businessId: string,
  data: ChangeEmailInput,
): Promise<ApiResponse<null>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const parsed = changeEmailSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      },
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Could not verify current user',
      },
    };
  }

  // Verify password before allowing email change
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.password,
  });
  if (signInError) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Password is incorrect' },
    };
  }

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.newEmail,
  });
  if (error) {
    return {
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    };
  }

  // Supabase sends a confirmation email to the new address — no revalidate needed
  return { success: true, data: null };
}

export async function upsertBusinessSettingsAction(
  businessId: string,
  data: UpdateBusinessSettingsInput,
): Promise<ApiResponse<BusinessSettings>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const parsed = updateBusinessSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      },
    };
  }

  try {
    const result = await settingsQuery.upsertBusinessSettings(
      businessId,
      parsed.data,
    );
    revalidatePath(businessSettingsPath(businessId));
    return { success: true, data: result };
  } catch (err) {
    console.error('[upsertBusinessSettingsAction] error:', err);
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'Failed to save settings' },
    };
  }
}

export async function updateNotificationPreferencesAction(
  businessId: string,
  data: UpdateNotificationPreferencesInput,
): Promise<ApiResponse<NotificationPreferences>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const parsed = updateNotificationPreferencesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
      },
    };
  }

  try {
    const result = await settingsQuery.upsertNotificationPreferences(
      verify.user!.id,
      parsed.data,
    );
    return { success: true, data: result };
  } catch (err) {
    console.error('[updateNotificationPreferencesAction] error:', err);
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'Failed to save preferences' },
    };
  }
}

export async function deactivateBusinessAction(
  businessId: string,
  data: DeactivateBusinessInput,
): Promise<ApiResponse<null>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const parsed = deactivateBusinessSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Type DEACTIVATE to confirm',
      },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('businesses')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', businessId);

  if (error) {
    console.error('[deactivateBusinessAction] DB error:', error);
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'Failed to deactivate business' },
    };
  }

  revalidatePath(businessPath(businessId));
  return { success: true, data: null };
}

export async function deleteAccountAction(
  businessId: string,
  data: { password: string; confirmation: string },
): Promise<ApiResponse<null>> {
  if (data.confirmation !== 'DELETE') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Type DELETE to confirm' },
    };
  }

  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const supabase = await createServerSupabaseClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Could not verify current user',
      },
    };
  }

  // Verify password before destructive action
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: data.password,
  });
  if (signInError) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Password is incorrect' },
    };
  }

  // Soft-delete: archive the profile first
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: 'inactive', archived_at: new Date().toISOString() })
    .eq('id', verify.user!.id);

  if (profileError) {
    console.error(
      '[deleteBusinessAccount] profile archive error:',
      profileError,
    );
    return {
      success: false,
      error: { code: 'DB_ERROR', message: 'Failed to archive account' },
    };
  }

  // Hard-delete from Supabase auth via admin client
  const adminClient = await createServerAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    verify.user!.id,
  );
  if (deleteError) {
    console.error('[deleteBusinessAccount] auth delete error:', deleteError);
    return {
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete account' },
    };
  }

  return { success: true, data: null };
}
