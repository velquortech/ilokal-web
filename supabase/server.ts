import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Apply security headers to all cookies
          const secureOptions = {
            ...options,
            httpOnly: true, // Prevent JavaScript access (XSS protection)
            secure: true, // Only send over HTTPS
            sameSite: 'lax' as const, // CSRF protection
            path: '/', // Available to entire app
          };
          cookieStore.set(name, value, secureOptions);
        });
      },
    },
  });
}
