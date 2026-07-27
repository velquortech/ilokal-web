'use server';

import { createServerSupabaseClient } from '@/supabase/server';

// Platform flags stored in app_settings (see .claude/REGISTRATION_GATING.md).
// Fallbacks are the pre-flag legacy behavior: documents required, no
// auto-verify — so a missing row can only make the flow stricter, never
// looser.
export interface RegistrationSettings {
  requireBusinessDocuments: boolean;
  autoVerifyBusinesses: boolean;
}

const FALLBACKS: RegistrationSettings = {
  requireBusinessDocuments: true,
  autoVerifyBusinesses: false,
};

export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['require_business_documents', 'auto_verify_businesses']);

  if (error || !data) {
    console.error('[getRegistrationSettings]', error);
    return FALLBACKS;
  }

  const byKey = new Map(data.map((row) => [row.key, row.value]));
  const asBool = (key: string, fallback: boolean): boolean => {
    const value = byKey.get(key);
    return typeof value === 'boolean' ? value : fallback;
  };

  return {
    requireBusinessDocuments: asBool(
      'require_business_documents',
      FALLBACKS.requireBusinessDocuments,
    ),
    autoVerifyBusinesses: asBool(
      'auto_verify_businesses',
      FALLBACKS.autoVerifyBusinesses,
    ),
  };
}

/**
 * Phase-4 booking kill switch (`enable_bookings`, default false).
 *
 * Fails CLOSED: an unreadable flag hides the booking UI rather than exposing a
 * half-configured flow. The DB enforces the same flag inside
 * `request_booking()`, so this is presentation only — hiding the button is not
 * the security boundary.
 */
export async function getBookingsEnabled(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'enable_bookings')
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('[getBookingsEnabled]', error);
      return false;
    }

    return data.value === true;
  } catch (err) {
    console.error('[getBookingsEnabled]', err);
    return false;
  }
}
