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

/**
 * Onboarding-tour kill switch (`enable_onboarding_tour`).
 *
 * **Default ON when the row is absent**, which is the opposite of the two flags
 * above — deliberately, and for a reason that does not generalise. Those gate
 * features that ship DARK: their routes 404 and the database refuses the write
 * independently, so an unset flag must mean "off" or a half-configured feature
 * leaks. The tour is a presentational overlay with no server side and nothing
 * to leak; treating "never configured" as "off" would ship a feature that only
 * works after an admin discovers a switch they were never told about.
 *
 * A real read FAILURE still returns false — an overlay that paints over the
 * dashboard is the one failure mode worth being timid about, and it is exactly
 * what this switch exists to stop without a deploy.
 *
 * Read straight from the table rather than through `public_feature_flags`: only
 * a signed-in business owner ever sees this, `app_settings` is readable `TO
 * authenticated`, and widening the anon-facing RPC for it would need a
 * migration to expose something anonymous visitors have no use for.
 */
export async function getOnboardingTourEnabled(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'enable_onboarding_tour')
      .maybeSingle();

    if (error) {
      console.error('[getOnboardingTourEnabled]', error);
      return false;
    }

    // No row = never configured = on. An admin toggling it off upserts `false`,
    // which lands in the branch below and sticks.
    if (!data) return true;

    return typeof data.value === 'boolean' ? data.value : true;
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;

    console.error('[getOnboardingTourEnabled]', err);
    return false;
  }
}
