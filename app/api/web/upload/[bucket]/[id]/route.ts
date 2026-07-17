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

    // Reject malformed/traversal-shaped paths before any ownership logic —
    // every legitimate object key here is `<uuid>/<filename>` with no empty,
    // '.' or '..' segments.
    const segments = filePath.split('/');
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      filePath.length === 0 ||
      segments.some((s) => s === '' || s === '.' || s === '..') ||
      !UUID_RE.test(segments[0])
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 },
      );
    }

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

    const isAdmin = auth.profile.role === 'admin';

    if (businessScopedBuckets.includes(bucket)) {
      if (!isAdmin) {
        const businessId = segments[0];
        const ownership = await verifyBusinessOwner(businessId);
        if (!ownership.authorized) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 },
          );
        }
      }
    } else if (bucket === 'avatars') {
      // Avatars are keyed `<userId>/<file>` — only the owner (or an admin) may
      // delete. Without this, any authenticated user could delete anyone's
      // avatar by path.
      if (!isAdmin && segments[0] !== auth.user.id) {
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
