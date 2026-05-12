import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
        { success: false, error: 'File size must be less than 5MB' },
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

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${businessId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('interior-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 400 },
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('interior-images').getPublicUrl(filePath);

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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}
