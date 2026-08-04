'use server';

import { createServerSupabaseClient } from '@/supabase/server';
import { isDynamicUsageError } from '@/lib/utils/dynamicUsage';

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
 * Read one boolean kill switch.
 *
 * Fails CLOSED: an unreadable flag hides the feature rather than exposing a
 * half-configured flow. Hiding UI is never the security boundary — the DB
 * enforces each flag itself (`request_booking()` checks `enable_bookings`;
 * the events triggers gate publication independently).
 *
 * Not exported: `'use server'` makes every export a callable endpoint, and a
 * client-suppliable key would let anyone probe arbitrary settings rows.
 */
type PublicFlag = 'enable_events' | 'enable_bookings';

async function readFlag(key: PublicFlag): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    // Via the RPC, NOT a table read: `app_settings` is readable `TO
    // authenticated` only, so selecting it directly returns zero rows for an
    // anonymous visitor — and this reader fails closed, which made the whole
    // public events surface invisible to logged-out users. The function is
    // SECURITY DEFINER with a fixed return list, so it exposes these two flags
    // and nothing else.
    const { data, error } = await supabase
      .rpc('public_feature_flags')
      .maybeSingle();

    if (error || !data) {
      if (error) console.error(`[readFlag ${key}]`, error);
      return false;
    }

    return (data as Record<PublicFlag, boolean>)[key] === true;
  } catch (err) {
    // Next signals "this route cannot be static" by THROWING from `cookies()`.
    // Swallowing that would answer `false` and let the route prerender with
    // the feature switched off — permanently, in the build output. Rethrow so
    // Next can mark the route dynamic, which is what it is.
    if (isDynamicUsageError(err)) throw err;

    console.error(`[readFlag ${key}]`, err);
    return false;
  }
}

// NOT React.cache()-wrapped: this module is `'use server'`, where every export
// must be a plain async function — wrapping it collapses the inferred type at
// call sites. The duplicate read per request is one tiny indexed lookup.

/** Phase-4 booking kill switch (`enable_bookings`, default false). */
export async function getBookingsEnabled(): Promise<boolean> {
  return readFlag('enable_bookings');
}

/** Events kill switch (`enable_events`, default false). */
export async function getEventsEnabled(): Promise<boolean> {
  return readFlag('enable_events');
}
