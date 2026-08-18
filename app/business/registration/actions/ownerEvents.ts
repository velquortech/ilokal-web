'use server';

import { createServerSupabaseClient } from '@/supabase/server';
import { logActionError } from '@/lib/utils/captureError';

/**
 * Owner-funnel event names. Kept as a union so a typo in a call site is a
 * compile error instead of a row nobody can aggregate. Registration events
 * land in Phase 2; later phases extend the union (coupon_dialog_open,
 * checklist_dismissed, chart_card_clicked…).
 */
export type OwnerEventName =
  | 'reg_step_viewed'
  | 'reg_step_completed'
  | 'reg_step_error'
  | 'reg_back_nav'
  | 'reg_submitted'
  | 'reg_category_searched'
  | 'reg_recent_picked'
  | 'dash_full_report_open'
  | 'dash_checklist_dismiss'
  | 'dash_card_clicked';

/**
 * Record one owner-funnel event (fire-and-forget by contract).
 *
 * Monitoring must never delay, reject, or alter the flow it describes: the
 * registration wizard and dashboard must behave identically whether the table
 * exists or not. So this action never throws to the caller — a failure is
 * logged (the Sentry funnel) and swallowed, and an unauthenticated caller is
 * a silent no-op (there is no owner to attribute the event to).
 *
 * `business_id` is intentionally optional: registration events fire before
 * the business row exists.
 */
export async function logOwnerEvent(
  event: OwnerEventName,
  payload: Record<string, unknown> = {},
  businessId?: string,
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('owner_events').insert({
      owner_id: user.id,
      business_id: businessId ?? null,
      event,
      payload,
    });
    if (error) throw error;
  } catch (error) {
    // Sentry funnel for the action layer; never propagated to the caller.
    logActionError('logOwnerEvent', error, undefined);
  }
}
