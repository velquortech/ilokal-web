import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

// Clear the caller's badge: mark every unread notification read. The mobile
// app calls this when the Updates tab gains focus.
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { error, count } = await auth.supabase
      .from('notifications')
      .update({ is_read: true }, { count: 'exact' })
      .eq('user_id', auth.user.id)
      .eq('is_read', false);

    if (error)
      return loggedServerError(
        'protected/mobile/notifications/read-all',
        error,
      );

    return successResponse({ updated: count ?? 0 });
  } catch {
    return generalErrorResponse();
  }
}
