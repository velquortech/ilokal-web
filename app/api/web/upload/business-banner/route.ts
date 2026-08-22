import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { checkUploadRateLimit } from '@/app/api/helpers/upload-rate-limit';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';
import { safeObjectName } from '@/lib/utils/storage';

// Banners are wide hero photos, so they get more headroom than logos (the
// client compresses to a WebP well under this before POSTing — the cap only
// guards direct API abuse, same as the registration files route).
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBusinessOwner();
    if (!auth.authorized) {
      const errorPayload =
        auth.error && typeof auth.error === 'object' && 'code' in auth.error
          ? (auth.error as { code: string; message: string })
          : { code: 'AUTHENTICATION_ERROR', message: 'Unauthorized' };

      const status = errorPayload.code === 'AUTHENTICATION_ERROR' ? 401 : 403;

      return NextResponse.json(
        { success: false, error: errorPayload.message || 'Unauthorized' },
        { status },
      );
    }

    // The verified session user. `verifyBusinessOwner` returns it on every
    // success path; an authorized result carrying none is unreachable today, so
    // treat it as unauthorized rather than skipping the guard — the failure
    // direction that matters here is an open flood door.
    if (!auth.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Before formData(): buffering a 4 MB body and re-encoding it through
    // sharp is exactly the cost this guard exists to prevent.
    const limited = checkUploadRateLimit(auth.user.id);
    if (limited) return limited;

    const supabase = await createServerSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const suppliedBusinessId =
      (formData.get('businessId') as string) || undefined;
    let businessId: string | undefined;

    if (suppliedBusinessId) {
      const suppliedAuth = await verifyBusinessOwner(suppliedBusinessId);
      if (!suppliedAuth.authorized) {
        const suppliedError =
          suppliedAuth.error &&
          typeof suppliedAuth.error === 'object' &&
          'code' in suppliedAuth.error
            ? (suppliedAuth.error as { code: string; message: string })
            : { code: 'AUTHENTICATION_ERROR', message: 'Unauthorized' };

        const status =
          suppliedError.code === 'AUTHENTICATION_ERROR' ? 401 : 403;

        return NextResponse.json(
          {
            success: false,
            error: suppliedError.message || 'Unauthorized',
          },
          { status },
        );
      }
      businessId = suppliedBusinessId;
    } else {
      businessId = auth.business?.id;
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 4MB' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed',
        },
        { status: 400 },
      );
    }

    // `safeObjectName` first: the owner's own filename used to land in the
    // object key verbatim, so a screenshot became `…-Screenshot 2026-08-08
    // 095928.webp` and every layer downstream had to agree on how to spell
    // that space. They did not — see lib/utils/storage.ts.
    const fileName = `${Date.now()}-${safeObjectName(toWebPFilename(file.name))}`;
    const filePath = `${businessId}/${fileName}`;

    await uploadWebP(supabase, 'shop-banners', filePath, file, {
      // Banners render full-width at the top of the shop page, so they get the
      // hero cap (1600px) rather than the square logo cap.
      maxDimension: IMAGE_PRESETS.hero,
    });

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('shop-banners').getPublicUrl(filePath);

    return NextResponse.json(
      {
        success: true,
        data: {
          url: publicUrl,
          path: filePath,
          fileName: fileName,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    // Storage/unexpected failure — log server-side, return a generic message so
    // raw driver errors (table/policy names) don't leak to the client.
    console.error('[upload/business-banner]', formatErrorForLog(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
      },
      { status: 500 },
    );
  }
}
