import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// Mark one notification read. RLS's "Users update own notifications" policy
// makes a foreign id a no-op (count 0 → 404) rather than an error.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const { error, count } = await auth.supabase
      .from('notifications')
      .update({ is_read: true }, { count: 'exact' })
      .eq('id', id)
      .eq('user_id', auth.user.id);

    if (error)
      return loggedServerError('protected/mobile/notifications/[id]', error);
    if (count === 0)
      return notFoundResponse({ message: 'Notification not found' });

    return successResponse({ message: 'Notification marked read' });
  } catch {
    return generalErrorResponse();
  }
}
