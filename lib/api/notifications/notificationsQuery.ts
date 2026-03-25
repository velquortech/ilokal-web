import { createServerSupabaseClient } from '@/supabase/server';
import type { Notification, NotificationPreferences } from '@/lib/types';

export async function fetchNotifications(
  user_id: string,
  page = 1,
  per_page = 20,
): Promise<{
  items: Notification[];
  total: number;
  page: number;
  per_page: number;
}> {
  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * per_page;

  const { data, count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (error) {
    console.error('[fetchNotifications]', error);
    return { items: [], total: 0, page, per_page };
  }

  return {
    items: (data as Notification[]) || [],
    total: count || 0,
    page,
    per_page,
  };
}

export async function createNotification(input: Partial<Notification>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert([input])
    .select()
    .single();
  if (error) {
    console.error('[createNotification]', error);
    return null;
  }
  return data as Notification;
}

export async function markAsRead(id: string, read = true, user_id?: string) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from('notifications')
    .update({ is_read: read })
    .eq('id', id);
  if (user_id) query = query.eq('user_id', user_id);
  const { error } = await query;
  if (error) {
    console.error('[markAsRead]', error);
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
