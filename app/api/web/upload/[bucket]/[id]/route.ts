import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bucket: string; id: string }> },
) {
  try {
    const auth = await assertAuthorized();
    if (!auth.authorized) return auth.error;
    const supabase = await createServerSupabaseClient();

    const { bucket, id } = await params;

    // Canonical bucket names — keep in sync with storage migration
    const validBuckets = [
      'avatars',
      'business-logos',
      'shop-logos',
      'business-interior',
      'interior-images',
      'shop-banners',
      'product-images',
      'verification-docs',
      'business-docs',
    ];
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bucket' },
        { status: 400 },
      );
    }

    // Decode the ID (it's URL encoded)
    const filePath = decodeURIComponent(id);

    // For business-scoped buckets, verify the caller owns the business whose
    // UUID is the first path segment. Admins bypass ownership check.
    const businessScopedBuckets = [
      'business-logos',
      'shop-logos',
      'business-interior',
      'interior-images',
      'shop-banners',
      'product-images',
      'verification-docs',
      'business-docs',
    ];

    if (businessScopedBuckets.includes(bucket)) {
      const isAdmin = auth.profile.role === 'admin';
      if (!isAdmin) {
        const businessId = filePath.split('/')[0];
        const ownership = await verifyBusinessOwner(businessId);
        if (!ownership.authorized) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 },
          );
        }
      }
    }

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (deleteError) {
      console.error('[DELETE /api/web/upload/[bucket]/[id]]', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete file' },
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
    console.error('[DELETE /api/web/upload/[bucket]/[id]]', error);
    return NextResponse.json(
      { success: false, error: 'Delete failed' },
      { status: 500 },
    );
  }
}
