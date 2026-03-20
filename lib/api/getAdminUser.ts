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

    // Fetch profile data including status
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
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
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // Not authenticated
    if (!authUser) {
      redirect(ROUTES.AUTH.LOGIN);
    }

    // Fetch full profile with status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      redirect(ROUTES.AUTH.LOGIN);
    }

    // Not admin
    if (profile.role !== 'admin') {
      redirect(ROUTES.DASHBOARD.HOME);
    }

    // Account suspended or inactive
    if (profile.status !== 'active') {
      console.warn(
        `[getAdminUserOrRedirect] Admin user ${authUser.id} has status: ${profile.status}`,
      );
      redirect(ROUTES.AUTH.LOGIN);
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
    console.error('[getAdminUserOrRedirect] Error:', error);
    redirect(ROUTES.AUTH.LOGIN);
  }
}

/**
 * Verify that the current user is a business owner
 * Redirects to home if not authorized
 * Also verifies account is active (not suspended)
 *
 * @throws Will redirect (not throw in traditional sense)
 * @returns The business user data
 */
export async function getBusinessUserOrRedirect(): Promise<User> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // Not authenticated
    if (!authUser) {
      redirect(ROUTES.AUTH.LOGIN);
    }

    // Fetch full profile with status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      redirect(ROUTES.AUTH.LOGIN);
    }

    // Not business owner
    if (profile.role !== 'business_owner') {
      redirect(ROUTES.DASHBOARD.HOME);
    }

    // Account suspended or inactive
    if (profile.status !== 'active') {
      console.warn(
        `[getBusinessUserOrRedirect] Business owner ${authUser.id} has status: ${profile.status}`,
      );
      redirect(ROUTES.AUTH.LOGIN);
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
    console.error('[getBusinessUserOrRedirect] Error:', error);
    redirect(ROUTES.AUTH.LOGIN);
  }
}
