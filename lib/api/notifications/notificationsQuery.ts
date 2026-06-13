import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Notification,
  NotificationPage,
  NotificationPreferences,
  EmitNotificationInput,
} from '@/lib/types';
import { encodeCursor, decodeCursor } from '@/lib/utils/cursor';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

/**
 * Keyset (cursor) page of the recipient's notifications, newest first.
 * RLS scopes rows to the authenticated user; we also filter `user_id`
 * explicitly so the `(user_id, created_at DESC, id DESC)` index is used.
 */
export async function fetchNotifications(
  user_id: string,
  params: { cursor?: string | null; limit?: number } = {},
): Promise<NotificationPage> {
  const supabase = await createServerSupabaseClient();
  const limit = clampLimit(params.limit);
  const cursor = decodeCursor(params.cursor);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    // (created_at, id) < (cursor.created_at, cursor.id)
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
    );
  }

  const [{ data, error }, unread_count] = await Promise.all([
    query,
    getUnreadCount(user_id),
  ]);

  if (error) {
    console.error('[fetchNotifications]', error);
    return { notifications: [], next_cursor: null, unread_count };
  }

  const rows = (data as Notification[]) ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const next_cursor =
    hasMore && last
      ? encodeCursor({ created_at: last.created_at, id: last.id })
      : null;

  return { notifications: page, next_cursor, unread_count };
}

/** Count of the recipient's unread notifications (RLS-scoped). */
export async function getUnreadCount(user_id: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user_id)
    .is('read_at', null);

  if (error) {
    console.error('[getUnreadCount]', error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Emit a notification to a recipient via the `create_notification` RPC
 * (SECURITY DEFINER — authorizes the caller as admin or the recipient).
 * Returns the new notification id, or null on failure.
 */
export async function emitNotification(
  input: EmitNotificationInput,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: input.user_id,
    p_type: input.type,
    p_title: input.title,
    p_body: input.body ?? null,
    p_business_id: input.business_id ?? null,
    p_actor_id: input.actor_id ?? null,
    p_metadata: (input.metadata ?? {}) as never,
  });

  if (error) {
    console.error('[emitNotification]', error);
    return null;
  }
  return (data as string) ?? null;
}

/** Mark a single notification read (RLS guarantees ownership). */
export async function markAsRead(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) {
    console.error('[markAsRead]', error);
    return false;
  }
  return true;
}

/** Mark every unread notification of the recipient read (RLS-scoped). */
export async function markAllAsRead(user_id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .is('read_at', null);

  if (error) {
    console.error('[markAllAsRead]', error);
    return false;
  }
  return true;
}

export async function getPreferences(
  user_id: string,
): Promise<NotificationPreferences | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user_id)
    .single();
  if (error) {
    console.error('[getPreferences]', error);
    return null;
  }
  return data as NotificationPreferences;
}

export async function upsertPreferences(
  user_id: string,
  prefs: Partial<NotificationPreferences>,
) {
  const supabase = await createServerSupabaseClient();
  const payload = { user_id, ...prefs };
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(payload)
    .select()
    .single();
  if (error) {
    console.error('[upsertPreferences]', error);
    return null;
  }
  return data as NotificationPreferences;
}
