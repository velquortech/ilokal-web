import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const VERIFIED_USER_ID_HEADER = 'x-verified-user-id';

export function createUserSupabaseClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function getMobileUser(req: NextRequest) {
  // Normalise auth-scheme per RFC 7235 §2.1 — scheme token is case-insensitive
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined;
  if (!token) return null;

  const supabase = createUserSupabaseClient(token);

  // Always verify the JWT here — do NOT trust the proxy-forwarded
  // `x-verified-user-id` header on its own. The proxy sets that header after its
  // own getUser(), but if the proxy/middleware is ever bypassed (a recurring
  // Next.js App Router bug class), a client could supply the header itself and
  // impersonate any user by id. getUser() validates the token, so a forged or
  // garbage token is rejected regardless of whether the proxy ran. This costs
  // one auth round-trip per protected request (the previous header fast-path
  // skipped it); a cheaper local verify is possible later via getClaims() with
  // asymmetric signing keys.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { user, token, supabase };
}
