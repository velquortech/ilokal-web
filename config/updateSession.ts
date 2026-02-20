import { CookieOptions, createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const isRestrictedPath = (path: string[], pathname: string): boolean =>
  path.some((item) => pathname.startsWith(item));

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
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

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { pathname } = request.nextUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from('users')
    .select('role, id')
    .eq('id', user?.id)
    .single();

  const baseAdminURL = `/backend/${userData?.id}`;
  const baseUserURL = `/employee/${userData?.id}`;
  const baseStaffURL = `/staff/${userData?.id}`;

  const protectedAdminRoutes = [
    'dashboard',
    'users',
    'leave-categories',
    'leaves',
    'user_credits',
    'attendance',
    'personal_management',
    'document_request',
    'requested_documents',
    'awards',
    'nominated_awards',
  ];
  const employeeRestrictedRoutes = ['/backend', '/staff'];
  const staffRestrictedRoutes = ['/backend', '/employee'];
  const adminRestrictedRoutes = ['/employee', '/staff'];

  const isProtected = protectedAdminRoutes.some((route) =>
    pathname.endsWith(route),
  );

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  if (
    userData?.role === 'employee' &&
    isRestrictedPath(employeeRestrictedRoutes, pathname)
  ) {
    return NextResponse.redirect(
      new URL(`${baseUserURL}/dashboard`, request.url),
    );
  }

  if (
    userData?.role === 'staff' &&
    isRestrictedPath(staffRestrictedRoutes, pathname)
  ) {
    return NextResponse.redirect(new URL(`${baseStaffURL}/user`, request.url));
  }

  if (
    userData?.role === 'admin' &&
    isRestrictedPath(adminRestrictedRoutes, pathname)
  ) {
    return NextResponse.redirect(
      new URL(`${baseAdminURL}/dashboard`, request.url),
    );
  }

  if (user && pathname === '/auth/sign-in' && userData?.role === 'admin') {
    return NextResponse.redirect(
      new URL(`${baseAdminURL}/dashboard`, request.url),
    );
  }

  return supabaseResponse;
}
