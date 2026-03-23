import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client helper. Uses a server-only service role key.
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use a server-only env var name to avoid accidental exposure to the client
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only)',
    );
  }

  return createServerClient(url, key, {
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
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch (err) {
          // Log the error so session/cookie failures are discoverable in server logs
          // (Don't throw — this may be called from Server Components where setting
          // cookies is not allowed.)
          // eslint-disable-next-line no-console
          console.error('supabase: failed to set cookies in createClient.setAll', err);
        }
      },
    },
  });
}
