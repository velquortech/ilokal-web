import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for documents
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: NextRequest) {
  try {
    let auth;
    try {
      auth = await verifyBusinessOwner();
    } catch (e) {
      console.error('[upload/verification-docs] verifyBusinessOwner threw', e);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 },
      );
    }

    if (!auth?.authorized) {
      const errorPayload =
        auth?.error && typeof auth.error === 'object' && 'code' in auth.error
          ? (auth.error as { code: string; message: string })
          : { code: 'AUTHENTICATION_ERROR', message: 'Unauthorized' };

      const status = errorPayload.code === 'AUTHENTICATION_ERROR' ? 401 : 403;

      return NextResponse.json(
        { success: false, error: errorPayload.message || 'Unauthorized' },
        { status },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    const suppliedBusinessId =
      (formData.get('businessId') as string) || undefined;
    let businessId: string | undefined;

    if (suppliedBusinessId) {
      let suppliedAuth;
      try {
        suppliedAuth = await verifyBusinessOwner(suppliedBusinessId);
      } catch (e) {
        console.error(
          '[upload/verification-docs] verifyBusinessOwner(suppliedId) threw',
          e,
        );
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 },
        );
      }

      if (!suppliedAuth?.authorized) {
        const suppliedError =
          suppliedAuth?.error &&
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
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only PDF, images (JPEG, PNG, GIF, WebP), and Word documents are allowed',
        },
        { status: 400 },
      );
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${businessId}/${fileName}`;

    const supabase = await createServerSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
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

    return NextResponse.json(
      {
        success: true,
        data: {
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
