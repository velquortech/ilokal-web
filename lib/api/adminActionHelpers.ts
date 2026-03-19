/**
 * Shared utilities for admin actions
 * Reduces boilerplate and centralizes error handling
 */

import { createServerSupabaseClient } from '@/config/server';
import { createClient } from '@/config';
import { CreateUserInput } from '@/services/api/userService';
import { AdminUser } from '@/lib/types/admin';

/**
 * Extended admin update input with optional password field
 */
export interface AdminUpdateUserInput {
  email?: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
  password?: string;
}

/**
 * Verify that the current user is an admin
 */
export async function verifyCurrentUserIsAdmin(): Promise<{
  authorized: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, error: 'Only admins can perform this action' };
  }

  return { authorized: true };
}

/**
 * Create an auth user and return their ID
 */
export async function createAuthUser(
  email: string,
  password: string,
): Promise<{ userId: string | null; error: string | null }> {
  const adminSupabase = await createClient();

  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return { userId: null, error: authError.message };
  }

  return { userId: authData.user?.id || null, error: null };
}

/**
 * Delete an auth user (which cascades to delete the profile)
 */
export async function deleteAuthUser(
  userId: string,
): Promise<{ error: string | null }> {
  const adminSupabase = await createClient();

  const { error: deleteError } =
    await adminSupabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  return { error: null };
}

/**
 * Update auth user (email and/or password)
 */
export async function updateAuthUser(
  userId: string,
  email?: string,
  password?: string,
): Promise<{ error: string | null }> {
  if (!email && !password) {
    return { error: null };
  }

  const adminSupabase = await createClient();
  const authUpdateData: Record<string, unknown> = {};

  if (email) {
    authUpdateData.email = email;
    authUpdateData.email_confirm = true;
  }

  if (password) {
    authUpdateData.password = password;
  }

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    userId,
    authUpdateData,
  );

  if (authError) {
    return { error: authError.message };
  }

  return { error: null };
}

/**
 * Build profile update data from AdminUpdateUserInput
 * Only includes fields that are explicitly provided
 */
export function buildProfileUpdateData(
  changes: AdminUpdateUserInput,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ('full_name' in changes && changes.full_name !== undefined) {
    updateData.full_name = changes.full_name;
  }
  if ('phone_number' in changes && changes.phone_number !== undefined) {
    updateData.phone_number = changes.phone_number;
  }
  if ('avatar_url' in changes && changes.avatar_url !== undefined) {
    updateData.avatar_url = changes.avatar_url;
  }
  if ('status' in changes && changes.status !== undefined) {
    updateData.status = changes.status;
  }

  return updateData;
}

/**
 * Create a profile in the database
 */
export async function createProfile(
  userId: string,
  formData: CreateUserInput,
): Promise<{ profile: AdminUser | null; error: string | null }> {
  const db = await createServerSupabaseClient();

  const phoneNumber = formData.phone_number?.trim();
  const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .insert({
      id: userId,
      email: formData.email,
      full_name: formData.full_name,
      phone_number: hasPhoneNumber ? phoneNumber : null,
      avatar_url: formData.avatar_url || null,
      role: formData.role,
      status: formData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileError) {
    return { profile: null, error: profileError.message };
  }

  return { profile, error: null };
}

/**
 * Update a profile in the database
 */
export async function updateProfile(
  profileId: string,
  updateData: Record<string, unknown>,
): Promise<{ profile: AdminUser | null; error: string | null }> {
  const db = await createServerSupabaseClient();

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)
    .select()
    .single();

  if (profileError) {
    return { profile: null, error: profileError.message };
  }

  return { profile, error: null };
}

/**
 * Update profile status
 */
export async function updateProfileStatus(
  profileId: string,
  status: 'active' | 'inactive' | 'suspended',
): Promise<{ profile: AdminUser | null; error: string | null }> {
  return updateProfile(profileId, {
    status,
    updated_at: new Date().toISOString(),
  });
}
