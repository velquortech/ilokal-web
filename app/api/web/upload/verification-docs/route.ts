import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireUploadShop,
  requireUploadUser,
} from '@/app/api/helpers/upload-auth';
import { checkUploadRateLimit } from '@/app/api/helpers/upload-rate-limit';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { safeObjectName } from '@/lib/utils/storage';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for documents
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
    const session = await requireUploadUser('upload/verification-docs');
    if (session instanceof NextResponse) return session;

    // Before formData(): buffering the body is the cost. Documents are stored
    // raw (no sharp pass — a PDF through a canvas is a corrupt PDF), so this
    // door is cheaper than the image ones, but it writes to the PRIVATE
    // verification-docs bucket and shares the same budget by design.
    const limited = checkUploadRateLimit(session.userId);
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // The shop this upload is FOR, from the form and verified. Required: a
    // missing id used to fall back to "the caller's shop", which for an owner
    // of two shops was an arbitrary one.
    const shop = await requireUploadShop(
      'upload/verification-docs',
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 2MB' },
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

    const fileName = `${Date.now()}-${safeObjectName(file.name)}`;
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
    console.error(
      '[POST /api/web/upload/verification-docs]',
      formatErrorForLog(error),
    );
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 },
    );
  }
}
