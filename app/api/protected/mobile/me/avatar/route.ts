import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Bearer-auth avatar upload for the mobile app. Mirrors the web cookie-auth
 * route (`/api/web/upload/avatar`) but authenticates via the mobile token so
 * the per-request client uploads under the user's own `avatars/{id}/` folder,
 * satisfying the storage ownership RLS. Returns the public URL; the caller then
 * PATCHes `/me` with `avatar_url`.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequestResponse({ message: 'No file provided' });
    }
    if (file.size > MAX_FILE_SIZE) {
      return badRequestResponse({ message: 'File size must be less than 5MB' });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequestResponse({
        message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed',
      });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${auth.user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await auth.supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      return generalErrorResponse({ message: uploadError.message });
    }

    const { data } = auth.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return successResponse({ avatar_url: data.publicUrl });
  } catch {
    return generalErrorResponse();
  }
}
