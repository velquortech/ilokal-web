import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function verifyAdminAccess(_request: NextRequest): Promise<{
  authorized: boolean;
  error?: NextResponse;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      authorized: false,
      error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      authorized: false,
      error: NextResponse.json(
        { message: 'Only admins can access this resource' },
        { status: 403 },
      ),
    };
  }

  return { authorized: true };
}
