import { createServerSupabaseClient } from '@/supabase/server';
import type { BusinessSettings, NotificationPreferences } from '@/lib/types';
import type { UpdateBusinessSettingsInput } from '@/lib/validation/settings';

export async function getBusinessSettings(
  businessId: string,
): Promise<BusinessSettings | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();
  if (error) return null;
  return data as BusinessSettings;
}

export async function upsertBusinessSettings(
  businessId: string,
  input: UpdateBusinessSettingsInput,
): Promise<BusinessSettings> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('business_settings')
    .upsert(
      {
        business_id: businessId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id' },
    )
    .select('*')
    .single();
  if (error || !data)
    throw new Error(error?.message ?? 'Failed to upsert business settings');
  return data as BusinessSettings;
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data as NotificationPreferences;
}

export async function upsertNotificationPreferences(
  userId: string,
  input: Pick<NotificationPreferences, 'email' | 'push' | 'digest'>,
): Promise<NotificationPreferences> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, ...input, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error || !data)
    throw new Error(
      error?.message ?? 'Failed to upsert notification preferences',
    );
  return data as NotificationPreferences;
}
