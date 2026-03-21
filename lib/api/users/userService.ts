/**
 * User Service - Shared Business Logic
 *
 * Centralized functions for user operations.
 * Used by both server actions and API routes to avoid duplication.
 */

import { createServerSupabaseClient } from '@/config/server';
import { UpdateCurrentUserProfileInput } from '@/lib/validation/auth';
import { User } from '@/lib/types';

// ============================================================================
// PROFILE DATABASE CONSTANTS
// ============================================================================

/**
 * Standard profile fields to select from the profiles table
 * Used across all profile queries to maintain consistency
 */
export const PROFILE_SELECT_FIELDS =
  'id, email, full_name, phone_number, role, avatar_url, status, archived_at' as const;

// ============================================================================
// PROFILE MAPPING HELPERS
// ============================================================================

/**
 * Map profile database record to User type
 *
 * Centralizes type casting and field mapping to ensure consistency
 * across all endpoints and server actions
 *
 * @param profile - Profile record from database
 * @returns Mapped User object
 */
export function mapProfileToUser(profile: Record<string, unknown>): User {
  return {
    id: profile.id as string,
    email: profile.email as string,
    full_name: profile.full_name as string,
    phone_number: profile.phone_number as string | null,
    role: profile.role as 'admin' | 'business_owner' | 'app_user',
    avatar_url: profile.avatar_url as string | null,
  };
}

/**
 * Fetch user profile by ID with full error handling
 *
 * Encapsulates the query, error handling, and type mapping
 * Used by login, session verification, and profile updates
 *
 * @param userId - User ID to fetch
 * @returns Mapped User object
 * @throws Error if profile not found
 */
export async function fetchProfileById(userId: string): Promise<User> {
  const supabase = await createServerSupabaseClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_FIELDS)
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error(
      `Failed to fetch profile: ${error?.message || 'Profile not found'}`,
    );
  }

  return mapProfileToUser(profile);
}

/**
 * Update user profile
 *
 * Shared function used by:
 * - Server action: updateCurrentUserProfileAction()
 * - API route: PUT /api/users/me
 *
 * @param userId - User ID (from auth.users.id)
 * @param data - Profile update data (full_name, phone_number, avatar_url)
 * @returns Updated user profile
 * @throws Error on database operation failure
 */
export async function updateUserProfile(
  userId: string,
  data: UpdateCurrentUserProfileInput,
): Promise<User> {
  const supabase = await createServerSupabaseClient();

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.full_name !== undefined) {
    updateData.full_name = data.full_name;
  }

  if (data.phone_number !== undefined) {
    updateData.phone_number = data.phone_number || null;
  }

  if (data.avatar_url !== undefined) {
    updateData.avatar_url = data.avatar_url || null;
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`);
  }

  // Fetch updated profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_FIELDS)
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    throw new Error('Failed to fetch updated profile');
  }

  // Map profile to User type
  return mapProfileToUser(profile);
}
