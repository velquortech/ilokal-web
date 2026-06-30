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
 * POST /api/protected/mobile/me/deactivate
 *
 * Reversible self-service deactivation: flips an ACTIVE account to 'inactive'.
 * Reverse it with POST /api/protected/mobile/me/reactivate.
 *
 * Guards (so a user can't self-clear an admin action via this route):
 *  - archived (deleted) accounts are rejected — use the delete flow, not this.
 *  - admin-imposed 'suspended' accounts are rejected.
 *  - already 'inactive' is a no-op success (idempotent).
 *
 * Note: this only sets the flag. Mobile signs the user out locally after a 200;
 * a still-valid access token is not revoked here (see tech-debt: mobile protected
 * routes are not yet status-gated server-side).
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
      return loggedServerError('me/deactivate read', readErr);

    if (current.archived_at)
      return forbiddenResponse({ message: 'Account is archived' });
    if (current.status === 'suspended')
      return forbiddenResponse({ message: 'Account is suspended' });
    if (current.status === 'inactive')
      return successResponse({
        profile: { id: auth.user.id, status: 'inactive' },
      });

    const { data, error } = await auth.supabase
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', auth.user.id)
      .eq('status', 'active') // only ever deactivate an active account
      .select('id, status, archived_at')
      .single();

    if (error) return loggedServerError('me/deactivate', error);

    return successResponse({ profile: data });
  } catch {
    return generalErrorResponse();
  }
}
