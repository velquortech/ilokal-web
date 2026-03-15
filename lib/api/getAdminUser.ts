/**
 * Server-side helper to fetch and verify current admin user
 * Used in admin layout and protected routes
 *
 * This is SSR-safe and will redirect if:
 * - User is not authenticated
 * - User does not have admin role
 */

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/config/server';
import { User } from '@/lib/types/user';
import { ROUTES } from '@/config/routeConfig';

/**
 * Fetch the current user from the server session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role,
      avatar_url: profile.avatar_url,
    };
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return null;
  }
}

/**
 * Verify that the current user is an admin
 * Redirects to home if not authorized
 *
 * @throws Will redirect (not throw in traditional sense)
 * @returns The admin user data
 */
export async function getAdminUserOrRedirect(): Promise<User> {
  const user = await getCurrentUser();

  // Not authenticated
  if (!user) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // Not admin
  if (user.role !== 'admin') {
    redirect(ROUTES.DASHBOARD.HOME);
  }

  return user;
}
