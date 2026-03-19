/**
 * Single source of truth for User/Profile types
 * Mirrors the 'profiles' table structure in Supabase
 *
 * TYPE HIERARCHY:
 * - database.ts: Raw DB types (role: string, status: string)
 * - user.ts: Domain types (role: UserRole enum, status literal union)
 * - Forms use domain types + Zod validation
 * - Components receive domain types
 *
 * NOTE: We intentionally don't use database.ts Tables<'profiles'> directly
 * because it doesn't have .csv type safety for enums. Instead, we define
 * strongly-typed domain types that mirror the DB schema but with proper enums.
 */

import type { Tables, TablesInsert, TablesUpdate } from './database';

export type UserRole = 'admin' | 'business_owner' | 'app_user';

/**
 * Core User/Profile type matching the database schema
 */
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  status: 'active' | 'inactive' | 'suspended';
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

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
export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};

export type FormFieldConfig = {
  name: keyof FormData;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  showFor?: string[];
};

export type SelectFieldConfig = Omit<FormFieldConfig, 'type'> & {
  options: { value: string; label: string }[];
};

/**
 * Database row type (raw from Supabase)
 * Use this when you need direct DB type access
 * @example const dbRow: DatabaseProfile = Tables<'profiles'>;
 */
export type DatabaseProfile = Tables<'profiles'>;
export type DatabaseInsertProfile = TablesInsert<'profiles'>;
export type DatabaseUpdateProfile = TablesUpdate<'profiles'>;
