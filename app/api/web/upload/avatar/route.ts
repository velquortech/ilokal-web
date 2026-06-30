import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const auth = await assertAuthorized();
    if (!auth.authorized) return auth.error;
    const supabase = await createServerSupabaseClient();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetUserId = (formData.get('userId') as string) || auth.user.id;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' },
        { status: 400 },
      );
    }

    const fileName = `${Date.now()}-${toWebPFilename(file.name)}`;
    const filePath = `${targetUserId}/${fileName}`;

    await uploadWebP(supabase, 'avatars', filePath, file, {
      maxDimension: IMAGE_PRESETS.avatar,
      upsert: true,
    });

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return NextResponse.json(
      { success: true, data: { publicUrl: data.publicUrl } },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
