'use server';

import { cache } from 'react';
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

/**
 * One flag read per request, shared by every caller.
 *
 * Via the RPC, NOT a table read: `app_settings` is readable `TO authenticated`
 * only, so an ANONYMOUS caller gets zero rows and **no error** — which reads as
 * "not configured" and yields the strict fallbacks. Invisible while every
 * caller was behind auth; the public `/for-business` page made it visible by
 * telling logged-out visitors they needed a business permit and a review while
 * the database said neither was true.
 *
 * `React.cache`d because a single public page render asked for these flags
 * FOUR times — once for the registration copy, twice inside `PublicShell` for
 * the nav kill switches, once more for the page metadata. `'use server'`
 * constrains this module's EXPORTS, not its internals, so caching a private
 * helper is safe where caching the exports is not.
 */
const readPublicFlags = cache(
  async (): Promise<Record<string, unknown> | null> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .rpc('public_feature_flags')
      .maybeSingle();

    if (error) {
      console.error('[readPublicFlags]', error);
      return null;
    }
    return (data as Record<string, unknown> | null) ?? null;
  },
);

export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  const data = await readPublicFlags();

  if (!data) return FALLBACKS;

  // The two registration keys were added to the RPC by 20260805090000. If the
  // app is deployed BEFORE that migration reaches the database, the older
  // function still resolves — successfully, without them — and reading that as
  // "not configured" would regress the authenticated flows that worked before:
  // the wizard would grow a Documents step and the success dialog would go
  // back to promising a review. So fall through to the table read, which is
  // what those callers used and which works for a signed-in user.
  const row = data as Partial<PublicFlagRow>;
  if (
    typeof row.require_business_documents !== 'boolean' ||
    typeof row.auto_verify_businesses !== 'boolean'
  ) {
    return readRegistrationSettingsFromTable(
      await createServerSupabaseClient(),
    );
  }

  return {
    requireBusinessDocuments: row.require_business_documents,
    autoVerifyBusinesses: row.auto_verify_businesses,
  };
}

type PublicFlagRow = {
  require_business_documents: boolean;
  auto_verify_businesses: boolean;
};

/**
 * The pre-RPC read, kept as the fallback for the deploy window described above.
 * Returns the strict defaults for a caller who cannot see the table — which is
 * every anonymous one, and the reason the RPC exists.
 */
async function readRegistrationSettingsFromTable(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<RegistrationSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['require_business_documents', 'auto_verify_businesses']);

  if (error || !data) {
    if (error) console.error('[getRegistrationSettings fallback]', error);
    return FALLBACKS;
  }

  const byKey = new Map(data.map((entry) => [entry.key, entry.value]));
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
    const data = await readPublicFlags();
    if (!data) return false;

    return data[key] === true;
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
 * **Fails closed, like its siblings.** The row is SEEDED `true` by migration
 * `20260804233000`, which is what makes that safe: "absent" is unreachable, so
 * this reader never has to guess. Defaulting an absent row to `true` instead
 * would have been actively unsafe here — `app_settings` is readable `TO
 * authenticated` only, so a caller on the `anon` role gets zero rows and NO
 * error, and an ON-by-default reader would read that as "enabled" and silently
 * defeat an admin who switched it off. Exactly the trap that moved `readFlag`
 * onto the `public_feature_flags` RPC.
 *
 * Read straight from the table rather than through that RPC: only a signed-in
 * business owner ever sees this, and widening the anon-facing function would
 * need a migration to expose something anonymous visitors have no use for.
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

    // No row visible — either never seeded, or the caller cannot read the
    // table. Both mean "we do not know", and an overlay that paints over the
    // dashboard is the one thing worth being timid about.
    if (!data) return false;

    return data.value === true;
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;

    console.error('[getOnboardingTourEnabled]', err);
    return false;
  }
}
