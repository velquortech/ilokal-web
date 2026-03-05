import { createServerSupabaseClient } from '@/config/server';
import { createClient } from '@/config';
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

// PUT - update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminSupabase = await createClient();
    const body = await request.json();

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only add fields if they are provided in the request body
    if ('full_name' in body && body.full_name !== undefined) {
      updateData.full_name = body.full_name;
    }
    if ('phone_number' in body && body.phone_number !== undefined) {
      updateData.phone_number = body.phone_number;
    }
    if ('avatar_url' in body && body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url;
    }
    if ('status' in body && body.status !== undefined) {
      updateData.status = body.status;
    }

    // Update profile in database (only if profile fields need updating)
    let profileData;
    if (Object.keys(updateData).length > 1) {
      // More than just updated_at
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { message: updateError.message },
          { status: 400 },
        );
      }
      profileData = data;
    } else {
      // Get current profile if no profile updates
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select()
        .eq('id', id)
        .single();

      if (fetchError) {
        return NextResponse.json(
          { message: fetchError.message },
          { status: 400 },
        );
      }
      profileData = data;
    }

    // Update email and/or password in auth if provided
    if ('email' in body || 'password' in body) {
      const authUpdateData: Record<string, unknown> = {};

      if ('email' in body && body.email) {
        authUpdateData.email = body.email;
        authUpdateData.email_confirm = true; // Admin can confirm email directly
      }

      if ('password' in body && body.password) {
        authUpdateData.password = body.password;
      }

      const { error: authError } =
        await adminSupabase.auth.admin.updateUserById(id, authUpdateData);

      if (authError) {
        return NextResponse.json(
          { message: authError.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Admin profile update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE - delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

    const { id } = await params;
    // Use admin client (with service secret key) for auth operations
    const supabase = await createClient();

    // Delete the user from auth.users using admin API
    // This will cascade-delete the profile due to ON DELETE CASCADE constraint
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

    if (deleteError) {
      return NextResponse.json(
        { message: deleteError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
