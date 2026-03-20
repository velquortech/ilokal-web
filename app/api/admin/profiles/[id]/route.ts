import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/api/verifyAdminAccess';

// GET - fetchSingleProfile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

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
