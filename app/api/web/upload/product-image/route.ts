import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
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

    const businessId = auth.business?.id;
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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

    const fileName = `${Date.now()}-${toWebPFilename(file.name)}`;
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
    console.error('[upload/product-image]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
      },
      { status: 500 },
    );
  }
}
