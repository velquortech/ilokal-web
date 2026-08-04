'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/supabase/server';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { AdminActionResponse } from '@/lib/types/admin';

/**
 * Every admin-flippable flag in `app_settings`.
 *
 * The allowlist is the security boundary: this action is a callable endpoint,
 * so without it a caller could write ANY settings row. Adding a feature flag
 * means adding it here — deliberately, not by accident.
 */
export type PlatformSettingKey =
  | 'require_business_documents'
  | 'auto_verify_businesses'
  | 'enable_bookings'
  | 'enable_events'
  | 'enable_onboarding_tour';

/** Original name, kept so existing registration call sites do not change. */
export type RegistrationSettingKey = PlatformSettingKey;

const ALLOWED_KEYS: PlatformSettingKey[] = [
  'require_business_documents',
  'auto_verify_businesses',
  'enable_bookings',
  'enable_events',
  'enable_onboarding_tour',
];

export async function updateRegistrationSettingAction(
  key: PlatformSettingKey,
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
