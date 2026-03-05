import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ROUTES, PROTECTED_ROUTES } from '@/config/routeConfig';

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

  // Fetch user profile with role
  let userRole: string | null = null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
  }

  // Define protected routes by role
  const adminRoutes = [PROTECTED_ROUTES.ADMIN];
  const businessRoutes = [PROTECTED_ROUTES.BUSINESS];
  const protectedRoutes = [...adminRoutes, ...businessRoutes];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isBusinessRoute = businessRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // Role-based access control for admin routes
  if (isAdminRoute && user && userRole !== 'admin') {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
  }

  // Role-based access control for business routes
  if (isBusinessRoute && user && userRole !== 'business_owner') {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, request.url));
  }

  return response;
}

export const config = {
  // Matcher must use static strings (evaluated at build time)
  // Maps to PROTECTED_ROUTES.ADMIN = '/admin' and PROTECTED_ROUTES.BUSINESS = '/business'
  matcher: ['/admin/:path*', '/business/:path*'],
};
