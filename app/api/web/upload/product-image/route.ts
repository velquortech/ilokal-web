import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { convertToWebP, toWebPFilename } from '@/lib/api/helpers/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
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
        { success: false, error: 'File size must be less than 5MB' },
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

    const webpBuffer = await convertToWebP(file);
    const fileName = `${Date.now()}-${toWebPFilename(file.name)}`;
    const filePath = `${businessId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, webpBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 400 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(filePath);

    return NextResponse.json(
      { success: true, data: { url: publicUrl, path: filePath, fileName } },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}
