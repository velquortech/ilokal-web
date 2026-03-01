import { createServerSupabaseClient } from '@/config/server';
import { createClient } from '@/config';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminSupabase = await createClient();
    const body = await request.json();

    // Check if user is admin
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (currentProfile?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only admins can perform this action' },
        { status: 403 },
      );
    }

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

    // Update profile in database (only if profile fields need updating)
    let profileData;
    if (Object.keys(updateData).length > 1) {
      // More than just updated_at
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      profileData = data;
    } else {
      // Get current profile if no profile updates
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
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
