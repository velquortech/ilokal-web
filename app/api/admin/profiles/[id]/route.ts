import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';

// GET - fetchSingleProfile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { message: fetchError.message },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * NOTE: PUT/DELETE mutations are handled via Server Actions in `/app/admin/actions.ts`
 * This endpoint is read-only for fetching single profiles only.
 * Server Actions provide better security context and error handling for mutations.
 */
