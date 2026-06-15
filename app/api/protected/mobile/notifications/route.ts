import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

// Mobile-only notification inbox, backed by the `business_notifications` table
// the fan-out triggers populate (migration 20260611000000). Deliberately
// separate from the cookie-auth /api/web/notifications routes (and their own
// `notifications` table) — neither imports the other, so the two surfaces
// can't break each other.

export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const supabase = auth.supabase;

    const { searchParams } = req.nextUrl;
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawPerPage = parseInt(searchParams.get('per_page') ?? '10', 10);
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const per_page = Math.min(
      50,
      Math.max(1, Number.isFinite(rawPerPage) ? rawPerPage : 10),
    );
    const offset = (page - 1) * per_page;

    // RLS already scopes rows to the caller; the explicit eq() keeps the
    // query plan on the (user_id, created_at) index regardless.
    const [listRes, unreadRes] = await Promise.all([
      supabase
        .from('business_notifications')
        .select('id, type, title, body, data, is_read, created_at', {
          count: 'exact',
        })
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + per_page - 1),
      supabase
        .from('business_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.user.id)
        .eq('is_read', false),
    ]);

    const error = listRes.error || unreadRes.error;
    if (error)
      return loggedServerError('protected/mobile/notifications', error);

    const total = listRes.count ?? 0;
    return successResponse({
      notifications: listRes.data ?? [],
      page,
      per_page,
      has_more: offset + per_page < total,
      unread_count: unreadRes.count ?? 0,
    });
  } catch {
    return generalErrorResponse();
  }
}
