import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Name prefix of every Supabase auth cookie (`sb-<project-ref>-auth-token`,
 * its `.0`/`.1` chunks, and `-code-verifier`). supabase-js derives this itself
 * and nothing here overrides `storageKey`/`cookieOptions.name`.
 */
export const SUPABASE_COOKIE_PREFIX = 'sb-';

/**
 * The attributes every Supabase auth cookie is written with. Deletion matches
 * on name + domain + path, so an expiry write MUST reuse these or the original
 * cookie survives — keep this the single source for both the write and the
 * clear (`clearSupabaseAuthCookies` in the auth actions).
 */
export const SUPABASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Session-aware server client (uses cookies to manage user sessions)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, {
            ...options,
            ...SUPABASE_COOKIE_OPTIONS,
          });
        });
      },
    },
  });
}

// Analytics client — uses the service secret key to bypass RLS so aggregate
// queries (retention, segments, funnel) can read all users' redemptions and
// subscriptions, not just the logged-in user's own rows.
export async function createAnalyticsSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Server-only secret — MUST NOT carry a NEXT_PUBLIC_ prefix (would inline into
  // the client bundle and bypass all RLS).
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only) for analytics client',
    );
  }

  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

// Admin/service client (server-only). Use this for privileged operations
// such as `auth.admin.*`. This client MUST use a server-only key.
export async function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role key MUST be server-only. DO NOT expose this via NEXT_PUBLIC_*
  // Only read from the server-side-only env `SUPABASE_SERVICE_ROLE_KEY`.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only)',
    );
  }

  // Admin client does not rely on request cookies
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for admin client
      },
    },
  });
}
