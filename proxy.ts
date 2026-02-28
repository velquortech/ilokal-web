import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  const adminRoutes = ['/dashboard/admin'];
  const businessRoutes = ['/dashboard/business'];
  const authRoutes = ['/auth/login', '/auth/signup'];
  const protectedRoutes = [...adminRoutes, ...businessRoutes];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isBusinessRoute = businessRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Role-based access control for admin routes
  if (isAdminRoute && user && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Role-based access control for business routes
  if (isBusinessRoute && user && userRole !== 'business_owner') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
