/**
 * Single source of truth for User/Profile types
 * Mirrors the 'profiles' table structure in Supabase
 */

export type UserRole = 'admin' | 'business_owner' | 'user';

/**
 * Core User/Profile type matching the database schema
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * User type for auth context (subset of Profile for client-side)
 */
export type User = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'phone_number' | 'role' | 'avatar_url'
>;

/**
 * Minimal user info for responses and stores
 */
export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}
