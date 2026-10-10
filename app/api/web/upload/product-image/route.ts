import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireUploadShop,
  requireUploadUser,
} from '@/app/api/helpers/upload-auth';
import { checkUploadRateLimit } from '@/app/api/helpers/upload-rate-limit';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';
import { safeObjectName } from '@/lib/utils/storage';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const session = await requireUploadUser('upload/product-image');
    if (session instanceof NextResponse) return session;

    // Before formData(): buffering a 2 MB body and re-encoding it through
    // sharp is exactly the cost this guard exists to prevent.
    const limited = checkUploadRateLimit(session.userId);
    if (limited) return limited;

    const supabase = await createServerSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // The shop this upload is FOR, from the form and verified. Required: a
    // missing id used to fall back to "the caller's shop", which for an owner
    // of two shops was an arbitrary one.
    const shop = await requireUploadShop(
      'upload/product-image',
      formData.get('businessId'),
    );
    if (shop instanceof NextResponse) return shop;
    const { businessId } = shop;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 2MB' },
        { status: 400 },
      );
    }

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

    await uploadWebP(supabase, 'product-images', filePath, file, {
      maxDimension: IMAGE_PRESETS.product,
    });

    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(filePath);

    return NextResponse.json(
      { success: true, data: { url: publicUrl, path: filePath, fileName } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error('[upload/product-image]', formatErrorForLog(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
      },
      { status: 500 },
    );
  }
}
