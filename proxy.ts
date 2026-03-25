import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ROUTES } from '@/config/routeConfig';
import {
  isProtectedPath,
  roleAllowedForPath,
} from '@/lib/utils/protectedRoutes';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase environment variables');
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

  const { pathname } = request.nextUrl;

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile with role and status
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

  // Define protected routes by role
  // Use centralized helper for protected-route decisions
  const isProtectedRoute = isProtectedPath(pathname);

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // Redirect suspended or inactive users away from protected routes
  if (isProtectedRoute && user && userStatus !== 'active') {
    console.warn(
      `[middleware] User ${user.id} with status '${userStatus}' attempted to access protected route: ${pathname}`,
    );
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // Role-based access control
  if (isProtectedRoute && user && !roleAllowedForPath(userRole, pathname)) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
  }

  return response;
}

export const config = {
  // Matcher must use static strings (evaluated at build time)
  // Maps to PROTECTED_ROUTES.ADMIN = '/admin' and PROTECTED_ROUTES.BUSINESS = '/business'
  matcher: [
    '/admin/:path*',
    '/business/:path*',
    '/admin/settings/:path*',
    '/business/settings/:path*',
  ],
};
