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
        'id, email, full_name, phone_number, avatar_url, role, status, archived_at, created_at',
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

/**
 * DELETE /api/protected/mobile/me
 *
 * Self-service account deletion — ARCHIVE ONLY (soft delete). The profile row and
 * the auth user are kept; the account is marked archived via `archived_at` and
 * dropped to `status='inactive'`. (`status` has no 'archived' value — its CHECK is
 * active|inactive|suspended — so `archived_at` is the archive marker, matching the
 * admin archive flow and the web login gate, which 403s any profile with
 * `archived_at` set.) A permanent hard delete remains admin-only
 * (DELETE /api/admin/profiles/[id]/delete).
 *
 * Idempotent: the `.is('archived_at', null)` guard makes a repeat call a no-op so
 * the original archive timestamp is preserved.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('profiles')
      .update({ status: 'inactive', archived_at: new Date().toISOString() })
      .eq('id', auth.user.id)
      .is('archived_at', null)
      .select('id, status, archived_at')
      .maybeSingle();

    if (error) return loggedServerError('protected/mobile/me DELETE', error);

    // data is null when the row was already archived (guard matched nothing).
    return successResponse({
      profile: data ?? { id: auth.user.id, status: 'inactive' },
      archived: true,
    });
  } catch {
    return generalErrorResponse();
  }
}
