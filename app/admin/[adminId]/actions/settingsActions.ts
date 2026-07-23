'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/supabase/server';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { AdminActionResponse } from '@/lib/types/admin';

export type RegistrationSettingKey =
  | 'require_business_documents'
  | 'auto_verify_businesses';

const ALLOWED_KEYS: RegistrationSettingKey[] = [
  'require_business_documents',
  'auto_verify_businesses',
];

export async function updateRegistrationSettingAction(
  key: RegistrationSettingKey,
  value: boolean,
): Promise<AdminActionResponse<{ key: string; value: boolean }>> {
  try {
    const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return { success: false, error: authError ?? 'Unauthorized' };
    }

    if (!ALLOWED_KEYS.includes(key) || typeof value !== 'boolean') {
      return { success: false, error: 'Invalid setting' };
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('app_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });

    if (error) {
      console.error('[updateRegistrationSettingAction]', error);
      return { success: false, error: 'Failed to update setting' };
    }

    revalidatePath('/admin', 'layout');
    return { success: true, data: { key, value } };
  } catch (error) {
    console.error('[updateRegistrationSettingAction]', error);
    return { success: false, error: 'Failed to update setting' };
  }
}
