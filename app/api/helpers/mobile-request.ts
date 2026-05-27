import { createClient, type User } from '@supabase/supabase-js';
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

  // Fast path: proxy already called getUser() and forwarded the verified ID.
  // Reuse it to avoid a redundant round-trip to the Supabase auth server.
  // Only user.id is guaranteed accurate on this path — handlers must not
  // read other user fields without calling getUser() themselves if needed.
  const verifiedId = req.headers.get(VERIFIED_USER_ID_HEADER);
  if (verifiedId) {
    const user = {
      id: verifiedId,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    } as User;
    return { user, token, supabase };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { user, token, supabase };
}
