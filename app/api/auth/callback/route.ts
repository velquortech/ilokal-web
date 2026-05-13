import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ROUTES } from '@/config/routeConfig';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL(`${ROUTES.AUTH.LOGIN}?error=missing_code`, origin),
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Code exchange error:', error.message);
    return NextResponse.redirect(
      new URL(`${ROUTES.AUTH.LOGIN}?error=auth_callback_error`, origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL(ROUTES.DASHBOARD.ADMIN, origin));
    }
    if (profile?.role === 'business_owner') {
      return NextResponse.redirect(new URL(ROUTES.DASHBOARD.BUSINESS, origin));
    }
  }

  return NextResponse.redirect(new URL(ROUTES.DASHBOARD.HOME, origin));
}
