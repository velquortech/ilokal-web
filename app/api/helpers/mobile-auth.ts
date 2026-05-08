import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

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
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createUserSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { user, token, supabase };
}
