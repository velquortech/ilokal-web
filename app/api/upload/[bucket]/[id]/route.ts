import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { bucket, id } = await params;

    // Validate bucket name
    const validBuckets = [
      'avatars',
      'business-logos',
      'business-interior',
      'verification-docs',
    ];
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bucket' },
        { status: 400 },
      );
    }

    // Decode the ID (it's URL encoded)
    const filePath = decodeURIComponent(id);

    // For verification-docs, only allow admins or the owner
    if (bucket === 'verification-docs') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      const isOwner = filePath.startsWith(user.id);

      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 },
        );
      }
    }

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { message: 'File deleted successfully' },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      },
      { status: 500 },
    );
  }
}
