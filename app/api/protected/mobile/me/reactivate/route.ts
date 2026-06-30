import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  forbiddenResponse,
  generalErrorResponse,
  loggedServerError,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

/**
 * POST /api/protected/mobile/me/reactivate
 *
 * Reverses a self-service deactivation (inactive -> active). Reachable while
 * deactivated because mobile protected routes are gated on JWT validity only, not
 * status.
 *
 * Guards (so a user can't self-clear an admin action):
 *  - archived (deleted) accounts are rejected — restoring those is admin-only.
 *  - admin-imposed 'suspended' accounts are rejected.
 *  - already 'active' is a no-op success (idempotent).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data: current, error: readErr } = await auth.supabase
      .from('profiles')
      .select('status, archived_at')
      .eq('id', auth.user.id)
      .single();

    if (readErr || !current)
      return loggedServerError('me/reactivate read', readErr);

    if (current.archived_at)
      return forbiddenResponse({ message: 'Account is archived' });
    if (current.status === 'suspended')
      return forbiddenResponse({ message: 'Account is suspended' });
    if (current.status === 'active')
      return successResponse({
        profile: { id: auth.user.id, status: 'active' },
      });

    const { data, error } = await auth.supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', auth.user.id)
      .eq('status', 'inactive') // only reactivate a self-deactivated account
      .is('archived_at', null) // never un-archive a deleted account
      .select('id, status, archived_at')
      .single();

    if (error) return loggedServerError('me/reactivate', error);

    return successResponse({ profile: data });
  } catch {
    return generalErrorResponse();
  }
}
