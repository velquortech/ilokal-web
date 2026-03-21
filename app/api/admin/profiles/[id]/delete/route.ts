import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/api/verifyAdminAccess';

/**
 * DELETE /api/admin/profiles/[id]/delete
 *
 * Permanently deletes a user profile from the database (hard delete).
 * Only works on archived users to prevent accidental deletion of active accounts.
 *
 * SECURITY: Requires admin access
 * CAUTION: This is a permanent operation - the user data is deleted from the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // First, verify the user is archived (soft deleted)
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, archived_at, full_name, email')
      .eq('id', id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { message: 'User profile not found' },
        { status: 404 },
      );
    }

    if (!profile.archived_at) {
      return NextResponse.json(
        {
          message:
            'Cannot permanently delete non-archived users. Soft delete them first.',
        },
        { status: 400 },
      );
    }

    // Delete the profile record from the database
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Profile permanent deletion error:', deleteError);
      return NextResponse.json(
        { message: deleteError.message },
        { status: 400 },
      );
    }

    // TODO: Also delete the associated auth user if necessary
    // For now, we're only deleting the profile data

    return NextResponse.json({
      message: `User ${profile.full_name} (${profile.email}) has been permanently deleted`,
      data: { id },
    });
  } catch (error) {
    console.error('Profile permanent deletion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
