import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Defined in `supabase/cookies.ts` (no `next/headers` import, so the proxy can
// use them too) and re-exported here to keep `@/supabase/server` import sites
// working.
export {
  SUPABASE_COOKIE_PREFIX,
  SUPABASE_COOKIE_OPTIONS,
} from '@/supabase/cookies';

import { SUPABASE_COOKIE_OPTIONS } from '@/supabase/cookies';

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
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              ...SUPABASE_COOKIE_OPTIONS,
            });
          });
        } catch {
          // Server Components render with a READ-ONLY cookie store: Next throws
          // "Cookies can only be modified in a Server Action or Route Handler".
          // auth-js calls setAll whenever it rotates an expiring access token,
          // so any RSC that touches the session hits this — and the throw
          // propagated out of getUser(), so getCurrentUser()'s catch turned a
          // live session into `null` and the page rendered as signed-out.
          //
          // Swallowing is the documented @supabase/ssr pattern: the write is
          // recoverable because `proxy.ts` refreshes the same cookies on a
          // mutable response for every matched page route. That makes the
          // matcher load-bearing — a route that reads the session MUST be
          // matched there, or its token never actually rotates.
        }
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
