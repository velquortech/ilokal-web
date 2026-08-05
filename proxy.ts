import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ROUTES } from '@/config/routeConfig';
import {
  isProtectedPath,
  roleAllowedForPath,
} from '@/lib/utils/protectedRoutes';
import {
  tooManyRequestsResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { VERIFIED_USER_ID_HEADER } from '@/app/api/helpers/mobile-request';
import { clientIp, rateLimit } from '@/app/api/helpers/rateLimit';
import {
  SUPABASE_COOKIE_OPTIONS,
  SUPABASE_COOKIE_PREFIX,
} from '@/supabase/cookies';

// Baseline flood guard for the mobile API surface (public + protected). Keyed by
// client IP. Generous so normal app usage (a screen fires several requests) and
// shared-NAT clients aren't tripped — this stops floods, not legitimate bursts.
// Tune via env; see rateLimit.ts for the per-instance limitation + distributed
// upgrade path (Upstash/KV).
const MOBILE_RATE_LIMIT = Number(process.env.MOBILE_RATE_LIMIT ?? 200);
const MOBILE_RATE_WINDOW_MS = Number(
  process.env.MOBILE_RATE_WINDOW_MS ?? 60_000,
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit the whole mobile API surface before any auth/DB work, so a flood
  // can't even reach getUser()/PostgREST.
  if (
    pathname.startsWith('/api/mobile') ||
    pathname.startsWith('/api/protected/mobile')
  ) {
    const { allowed, retryAfterSec } = rateLimit(
      `mobile:${clientIp(request)}`,
      MOBILE_RATE_LIMIT,
      MOBILE_RATE_WINDOW_MS,
    );
    if (!allowed) return tooManyRequestsResponse(retryAfterSec);
  }

  // Public mobile API needs no session/role gating — return after the rate check
  // rather than falling through to the page-route auth logic below.
  if (pathname.startsWith('/api/mobile')) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error('[proxy] Missing Supabase environment variables');
    return pathname.startsWith('/api/protected')
      ? unauthorizedResponse()
      : NextResponse.next({ request });
  }

  // API protected routes: verify the JWT before the handler runs so expired/forged
  // tokens are rejected here rather than inside getMobileUser().
  if (pathname.startsWith('/api/protected')) {
    // Normalise scheme to handle case-insensitive RFC 7235 auth-scheme values
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : null;

    // Collect any refreshed cookies (cookie-session path only; Bearer is stateless)
    const refreshedCookies: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const supabase = bearerToken
      ? createServerClient(url, key, {
          global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          cookies: { getAll: () => [], setAll: () => {} },
        })
      : createServerClient(url, key, {
          cookies: {
            getAll: () => request.cookies.getAll(),
            // Capture refreshed tokens so they can be written onto the response
            setAll: (cs) => {
              refreshedCookies.push(...cs);
            },
          },
        });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorizedResponse();

    // Forward the verified user ID to the handler; strip any client-supplied value
    // first to prevent spoofing. Handlers can use this to skip a redundant getUser().
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.delete(VERIFIED_USER_ID_HEADER);
    forwardedHeaders.set(VERIFIED_USER_ID_HEADER, user.id);

    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });
    // Write any refreshed session cookies onto the response
    refreshedCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  }

  // Admin API routes: verify an authenticated admin before the handler runs.
  // These are cookie-session (web) routes, so unlike /api/protected we check the
  // role here and return JSON 401/403 rather than a redirect. Handlers still run
  // their own assertAuthorized check (defense in depth).
  if (pathname.startsWith('/api/admin')) {
    const refreshedCookies: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => {
          refreshedCookies.push(...cs);
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorizedResponse();

    // Role from JWT app_metadata (sync_role_to_jwt trigger), profiles fallback.
    let role = (user.app_metadata?.role as string | undefined) ?? null;
    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = profile?.role ?? null;
    }

    if (role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 },
      );
    }

    const response = NextResponse.next({ request });
    refreshedCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    return response;
  }

  // Page route protection: refresh session cookie and enforce role-based redirects
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let userStatus: string | null = null;
  if (user?.id) {
    // Phase 2: role/status are synced into app_metadata by the sync_role_to_jwt trigger
    // (migration 20260527000000). Fall back to a profiles SELECT when not yet populated.
    const metaRole = user.app_metadata?.role as string | undefined;
    const metaStatus = user.app_metadata?.status as string | undefined;

    if (metaRole && metaStatus) {
      userRole = metaRole;
      userStatus = metaStatus;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();
      userRole = profile?.role ?? null;
      userStatus = profile?.status ?? null;
    }
  }

  const isProtectedRoute = isProtectedPath(pathname);

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.SIGN_IN, request.url));
  }

  // Only block on an explicitly non-active status. null means the profile row
  // doesn't exist yet (e.g. trigger lag on first OAuth login) — let the page
  // handle it rather than redirect-looping the user to /sign-in.
  if (
    isProtectedRoute &&
    user &&
    userStatus !== null &&
    userStatus !== 'active'
  ) {
    console.warn(
      `[proxy] User ${user.id} status '${userStatus}' blocked on ${pathname}`,
    );
    return NextResponse.redirect(new URL(ROUTES.AUTH.SIGN_IN, request.url));
  }

  if (isProtectedRoute && user && !roleAllowedForPath(userRole, pathname)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
  }

  // MFA elevation gate. The sign-in forms set the session BEFORE the TOTP step,
  // so a user who abandons that step (or navigates straight to a dashboard URL)
  // holds a valid AAL1 cookie on an MFA-enrolled account. Nothing downstream
  // checks AAL, so without this the second factor is advisory only.
  //
  // getAuthenticatorAssuranceLevel() is local work — it decodes the session JWT
  // (`aal` claim) and reads the verified factors already present on the session
  // user. No extra network round trip per navigation.
  if (isProtectedRoute && user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    // Fail OPEN when the level is unknown (null): only an explicit
    // "aal2 available but not reached" is a half-authenticated session.
    if (aal?.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
      console.warn(
        `[proxy] User ${user.id} blocked on ${pathname}: MFA not completed (aal1)`,
      );
      const signIn = new URL(ROUTES.AUTH.SIGN_IN, request.url);
      signIn.searchParams.set('mfa', 'required');
      const mfaRedirect = NextResponse.redirect(signIn);
      // Kill the half-authenticated session so the door starts clean instead of
      // leaving a live AAL1 cookie behind the login form.
      for (const { name } of request.cookies.getAll()) {
        if (!name.startsWith(SUPABASE_COOKIE_PREFIX)) continue;
        mfaRedirect.cookies.set(name, '', {
          ...SUPABASE_COOKIE_OPTIONS,
          maxAge: 0,
        });
      }
      return mfaRedirect;
    }
  }

  return response;
}

export const config = {
  // Each base path needs its own entry because `:path*` matches zero-or-more
  // path SEGMENTS — it does not match the bare path itself (e.g. `/admin`).
  // Using `:path+` (one-or-more) for nested entries avoids double-matching.
  matcher: [
    '/admin',
    '/admin/:path+',
    '/business',
    '/business/:path+',
    '/customer',
    '/customer/:path+',
    // Public, but session-aware: the explore layout reads the session to pick
    // its chrome. Unmatched, nothing here refreshes an expiring token — the
    // RSC would try to (and cannot) write the rotated cookie itself, and the
    // visitor silently renders as signed-out. `isProtectedPath` is false for
    // these paths, so no redirect or role gate applies — refresh only.
    '/explore',
    '/explore/:path+',
    // Same reason: `/for-business` reads the session to pick its CTA and to
    // redirect an owner who already has a shop.
    '/for-business',
    '/api/admin',
    '/api/admin/:path+',
    '/api/protected/:path+',
    '/api/mobile/:path+',
  ],
};
