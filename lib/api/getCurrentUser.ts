/**
 * Server-side helper to fetch and verify current admin user
 * Used in admin layout and protected routes
 *
 * This is SSR-safe and will redirect if:
 * - User is not authenticated
 * - User does not have admin role
 */

import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
import { User } from '@/lib/types/user';
import { ROUTES } from '@/config/routeConfig';
import { isDynamicUsageError } from '@/lib/utils/dynamicUsage';
import { captureServerError } from '@/lib/utils/captureError';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * Fetch the current user from the server session
 * Returns null if not authenticated
 */
/**
 * `React.cache`d: a single public render asks for the session twice — once in
 * the page, once in `PublicShell` — and each call is a GoTrue round trip plus a
 * `profiles` select. Deduped per request; this module is not `'use server'`, so
 * the wrap is safe here.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    // Fetch profile data including status + archive marker (archived_at is
    // the soft-delete flag — status has no 'archived' value).
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, archived_at',
      )
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
      status: profile.status,
      archived_at: profile.archived_at,
    };
  } catch (error) {
    // `cookies()` throws to say "this route must be dynamic". Answering `null`
    // there would prerender the page as SIGNED OUT and bake that in.
    if (isDynamicUsageError(error)) throw error;
    console.error('[getCurrentUser] Error:', formatErrorForLog(error));
    return null;
  }
});

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
      redirect(ROUTES.AUTH.SIGN_IN);
    }

    // Fetch full profile with status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      redirect(ROUTES.AUTH.SIGN_IN);
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
      redirect(ROUTES.AUTH.SIGN_IN);
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
    if (isRedirectError(error) || isDynamicUsageError(error)) throw error;
    // ST5: anything reaching here is a genuine failure — a Supabase outage, a
    // PostgREST 5xx — and the response to it is to sign the user out. Without a
    // report, a partial outage presents as *every admin being logged out* with
    // nothing anywhere to explain it. The control-flow throws are rethrown
    // above, so this only ever reports a real fault.
    captureServerError('getAdminUserOrRedirect', error);
    console.error('[getAdminUserOrRedirect] Error:', formatErrorForLog(error));
    redirect(ROUTES.AUTH.SIGN_IN);
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
      redirect(ROUTES.AUTH.SIGN_IN);
    }

    // Fetch full profile with status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      redirect(ROUTES.AUTH.SIGN_IN);
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
      redirect(ROUTES.AUTH.SIGN_IN);
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
    if (isRedirectError(error) || isDynamicUsageError(error)) throw error;
    // Same reasoning as `getAdminUserOrRedirect` above.
    captureServerError('getBusinessUserOrRedirect', error);
    console.error(
      '[getBusinessUserOrRedirect] Error:',
      formatErrorForLog(error),
    );
    redirect(ROUTES.AUTH.SIGN_IN);
  }
}
