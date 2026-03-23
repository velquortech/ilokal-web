import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // This should be a server-only key (service role) — not exposed to the client
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Apply secure defaults to cookies; allow local dev when not in production
          const secureOptions = {
            ...options,
            httpOnly: true, // Prevent JavaScript access (XSS protection)
            secure: process.env.NODE_ENV === 'production', // Only require HTTPS in prod
            sameSite: 'lax' as const, // CSRF protection
            path: '/', // Available to entire app
          };
          cookieStore.set(name, value, secureOptions);
        });
      },
    },
  });
}
