import { createServerSupabaseClient } from '@/supabase/server';
import { describeDbError } from '@/lib/utils/describeDbError';

/**
 * Writers for the two stored onboarding facts.
 *
 * **`upsert`, never `update`.** The `business_settings` row is created lazily
 * on the owner's first save, so most shops have none when they answer the tour
 * — an `update` would report success having written nothing, which is the
 * silent failure this whole phase exists to remove. PostgREST's upsert only
 * touches the columns in the payload, so hours, contact details and review
 * settings on an existing row are left exactly as they were.
 *
 * Repeat calls overwrite the timestamp rather than preserving the first. The
 * value is read as a boolean everywhere; "when it was last answered" is a
 * truer reading of a replayed-then-finished tour than a stale first answer.
 */

type WriteResult = { ok: boolean };

async function stamp(
  businessId: string,
  column: 'onboarding_tour_completed_at' | 'onboarding_checklist_dismissed_at',
): Promise<WriteResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('business_settings').upsert(
      {
        business_id: businessId,
        [column]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id' },
    );

    if (error) throw error;
    return { ok: true };
  } catch (err) {
    // Never rethrown: failing to record a dismissal must not break the page
    // the owner is standing on. The client keeps its localStorage echo, so the
    // visible behaviour survives a failed write on that device.
    console.error(`[onboardingService ${column}]`, describeDbError(err));
    return { ok: false };
  }
}

/** Finished OR skipped — both mean "do not offer it again". */
export function markTourCompleted(businessId: string): Promise<WriteResult> {
  return stamp(businessId, 'onboarding_tour_completed_at');
}

export function markChecklistDismissed(
  businessId: string,
): Promise<WriteResult> {
  return stamp(businessId, 'onboarding_checklist_dismissed_at');
}
