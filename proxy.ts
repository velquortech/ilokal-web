import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ROUTES } from '@/config/routeConfig';
import {
  isProtectedPath,
  roleAllowedForPath,
} from '@/lib/utils/protectedRoutes';
import { unauthorizedResponse } from '@/app/api/helpers/response';
import { VERIFIED_USER_ID_HEADER } from '@/app/api/helpers/mobile-request';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // Only block on an explicitly non-active status. null means the profile row
  // doesn't exist yet (e.g. trigger lag on first OAuth login) — let the page
  // handle it rather than redirect-looping the user to /login.
  if (
    isProtectedRoute &&
    user &&
    userStatus !== null &&
    userStatus !== 'active'
  ) {
    console.warn(
      `[proxy] User ${user.id} status '${userStatus}' blocked on ${pathname}`,
    );
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  if (isProtectedRoute && user && !roleAllowedForPath(userRole, pathname)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
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
    '/api/protected/:path+',
  ],
};
