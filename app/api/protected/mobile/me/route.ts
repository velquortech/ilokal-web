import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, avatar_url, role, status, created_at',
      )
      .eq('id', auth.user.id)
      .single();

    if (error || !data)
      return notFoundResponse({ message: 'Profile not found' });

    return successResponse({ profile: data });
  } catch {
    return generalErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { full_name, phone_number, avatar_url } = body;

    const updates: Record<string, string | null> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return badRequestResponse({ message: 'No updatable fields provided' });
    }

    const { data, error } = await auth.supabase
      .from('profiles')
      .update(updates)
      .eq('id', auth.user.id)
      .select('id, email, full_name, phone_number, avatar_url, role, status')
      .single();

    if (error) return loggedServerError('protected/mobile/me', error);

    return successResponse({ profile: data });
  } catch {
    return generalErrorResponse();
  }
}
