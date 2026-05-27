import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ROUTES } from '@/config/routeConfig';
import {
  isProtectedPath,
  roleAllowedForPath,
} from '@/lib/utils/protectedRoutes';
import { unauthorizedResponse } from '@/app/api/helpers/response';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API protected routes: shallow presence check only — full JWT verification
  // happens inside each handler via getMobileUser(). This early-exit saves a
  // Supabase round-trip for requests that carry no credentials at all.
  if (pathname.startsWith('/api/protected')) {
    const cookieAuth = request.cookies.get(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_TOKEN}-auth-token`,
    );
    const bearerAuth = request.headers
      .get('Authorization')
      ?.startsWith('Bearer ')
      ? request.headers.get('Authorization')
      : null;

    if (!cookieAuth && !bearerAuth) {
      return unauthorizedResponse();
    }
    return NextResponse.next();
  }

  // Page route protection: refresh session cookie and enforce role-based redirects
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error('[middleware] Missing Supabase environment variables');
    return response;
  }

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
    userStatus = profile?.status ?? null;
  }

  const isProtectedRoute = isProtectedPath(pathname);

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  if (isProtectedRoute && user && userStatus !== 'active') {
    console.warn(
      `[middleware] User ${user.id} status '${userStatus}' blocked on ${pathname}`,
    );
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  if (isProtectedRoute && user && !roleAllowedForPath(userRole, pathname)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/business/:path*', '/api/protected/:path*'],
};
