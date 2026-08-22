'use server';

/**
 * Registration follow-up — admin send actions.
 *
 * Emails an owner who created an account but never listed a shop. The cohort is
 * 49% of all owner accounts (measured 2026-08-22) and the product previously had
 * no way to reach it; see `.claude/REGISTRATION_FUNNEL.md` (P7).
 *
 * A deliberate twin of `menuFollowUpActions.ts`, with the same guarantees,
 * because every export here is a publicly invocable endpoint:
 *
 *   - proves the caller is admin,
 *   - RE-VERIFIES the target at send time (the list the admin clicked is a hint,
 *     not a gate — an owner may have registered in between),
 *   - rate-limits (Server-Action POSTs never reach the proxy limiter, and the
 *     batch fans out N emails),
 *   - claims the cooldown ATOMICALLY before sending, and restores the prior
 *     marker if the send fails, so a failed email doesn't silence an owner for a
 *     whole cooldown,
 *   - never throws; each target yields an outcome so a batch survives one bad row.
 *
 * ⚠️ Unlike the menu twin there is NO re-check RPC. The eligibility test here is
 * two plain reads the service-role client can already do (the profile, and
 * whether any live business exists), so adding a fourth SECURITY DEFINER
 * function would be surface for nothing.
 *
 * Every failure path calls `logActionError`. The menu twin logs its failures to
 * the console WITHOUT capturing them (`menuFollowUpActions.ts:102,141,166`),
 * which is a real gap noted in the plan's §8 — mirroring the structure was right,
 * mirroring that would not have been.
 */

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { createServerAdminClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { ROUTES, adminMenuFollowUpPath } from '@/config/routeConfig';
import { sendRegistrationFollowUpEmail } from '@/app/api/emails/sendRegistrationFollowUp';
import { getOwnersMissingBusinessIds } from '@/lib/api/admin/registrationFollowUpQuery';
import { logActionError } from '@/lib/utils/captureError';
import { z } from 'zod';

const ownerId = z.guid('Invalid owner id');
// No `.max` here on purpose: an over-cap list is not rejected, it is sent up to
// the cap and the overflow is REPORTED (`capped`). The floor is the only hard rule.
const batchSchema = z.array(ownerId).min(1, 'Nothing selected');

const RATE_LIMIT = Number(process.env.ADMIN_ACTION_RATE_LIMIT ?? 20);
const RATE_WINDOW_MS = Number(
  process.env.ADMIN_ACTION_RATE_WINDOW_MS ?? 60_000,
);
/** Skip an owner reminded inside this window (default 7 days). Env-tunable. */
const COOLDOWN_MS =
  Number(process.env.REGISTRATION_REMINDER_COOLDOWN_HOURS ?? 24 * 7) *
  60 *
  60 *
  1000;

/** The per-owner outcome — the shape the batch reports counts over. */
export type RegistrationFollowUpOutcome =
  | { status: 'sent'; ownerId: string }
  | { status: 'skipped'; ownerId: string; reason: string }
  | { status: 'failed'; ownerId: string; reason: string };

export interface RegistrationFollowUpActionResult {
  ok: boolean;
  outcome?: RegistrationFollowUpOutcome;
  error?: string;
}

export interface RegistrationFollowUpBatchResult {
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  /** How many ids were dropped for exceeding the per-run cap. */
  capped: number;
  outcomes: RegistrationFollowUpOutcome[];
  error?: string;
}

/** The absolute CTA link base. Fail-closed in production: no base, no send. */
function ctaBase(): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '').replace(
    /\/+$/,
    '',
  );
  if (base) return base;
  // The dev sandbox logs the email rather than sending, so a localhost link is
  // fine there; a missing base in production would build a broken relative CTA.
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null;
}

/**
 * Send to ONE owner, assuming admin is already verified. Returns an outcome —
 * never throws — so the batch loop can keep going past a single failure.
 *
 * `admin` is a service-role client (RLS-bypassing): the caller has proven admin
 * before creating it.
 */
async function sendToOwner(
  admin: Awaited<ReturnType<typeof createServerAdminClient>>,
  id: string,
  base: string,
): Promise<RegistrationFollowUpOutcome> {
  const { data: profile, error } = await admin
    .from('profiles')
    .select(
      'id, email, full_name, role, archived_at, registration_reminder_sent_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logActionError('registrationFollowUp:target', error);
    return { status: 'failed', ownerId: id, reason: 'LOOKUP_FAILED' };
  }
  if (!profile) return { status: 'skipped', ownerId: id, reason: 'NOT_FOUND' };

  // Re-checked at send time — the list is not trusted.
  if (profile.role !== 'business_owner' || profile.archived_at) {
    return { status: 'skipped', ownerId: id, reason: 'NOT_ELIGIBLE' };
  }
  if (!profile.email) {
    return { status: 'skipped', ownerId: id, reason: 'NO_EMAIL' };
  }

  // The whole point of the nudge: they may have registered since the list was
  // rendered, in which case emailing "your shop is not listed" is wrong.
  const { count: liveBusinesses, error: bizError } = await admin
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', id)
    .is('archived_at', null);

  if (bizError) {
    logActionError('registrationFollowUp:eligibility', bizError);
    return { status: 'failed', ownerId: id, reason: 'LOOKUP_FAILED' };
  }
  if ((liveBusinesses ?? 0) > 0) {
    return { status: 'skipped', ownerId: id, reason: 'ALREADY_REGISTERED' };
  }

  // How far they got, for the copy. Advisory only — a failure here must not stop
  // the send, it just costs the personalised line.
  let furthestStep: number | undefined;
  const { data: steps, error: stepsError } = await admin
    .from('owner_events')
    .select('payload')
    .eq('owner_id', id)
    .in('event', ['reg_step_viewed', 'reg_step_completed', 'reg_step_error']);
  if (stepsError) {
    logActionError('registrationFollowUp:steps', stepsError);
  } else if (steps) {
    const values = steps
      .map((row) => Number((row.payload as { step?: unknown })?.step))
      .filter((value) => Number.isInteger(value) && value >= 1);
    if (values.length > 0) furthestStep = Math.max(...values);
  }

  // 🔴 CLAIM before sending, atomically. The read→check→send→stamp above is a
  // TOCTOU window: two tabs, a batch racing a single send, or two admins could
  // all read a null/expired marker and all email the same owner. This one
  // conditional UPDATE is the cross-process guard — only the writer whose
  // predicate still holds wins the row. Idempotency for a double-click, too.
  const cutoffIso = new Date(Date.now() - COOLDOWN_MS).toISOString();
  const prior = profile.registration_reminder_sent_at ?? null;
  const nowIso = new Date().toISOString();

  const { data: claimed, error: claimError } = await admin
    .from('profiles')
    .update({ registration_reminder_sent_at: nowIso })
    .eq('id', id)
    // Still within the cooldown ⇒ predicate fails ⇒ no row ⇒ someone already
    // has it (or it was reminded recently).
    .or(
      `registration_reminder_sent_at.is.null,registration_reminder_sent_at.lt.${cutoffIso}`,
    )
    .select('id');

  if (claimError) {
    logActionError('registrationFollowUp:claim', claimError);
    return { status: 'failed', ownerId: id, reason: 'CLAIM_FAILED' };
  }
  if (!claimed || claimed.length === 0) {
    return { status: 'skipped', ownerId: id, reason: 'RECENTLY_SENT' };
  }

  const { sent } = await sendRegistrationFollowUpEmail({
    to: profile.email,
    ctaUrl: `${base}${ROUTES.BUSINESS.registration}`,
    recipientName: profile.full_name ?? undefined,
    furthestStep,
  });

  if (!sent) {
    // The claim moved the marker forward but the email never left — restore the
    // PRIOR value so the owner stays retryable rather than being silenced for a
    // whole cooldown by a send that failed.
    const { error: restoreError } = await admin
      .from('profiles')
      .update({ registration_reminder_sent_at: prior })
      .eq('id', id);
    if (restoreError) {
      logActionError('registrationFollowUp:restore', restoreError);
    }
    return { status: 'failed', ownerId: id, reason: 'SEND_FAILED' };
  }

  return { status: 'sent', ownerId: id };
}

/** Admin gate shared by every action. Returns the admin id or an error. */
async function requireAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return { ok: false, error: 'Unauthorized' };
  }
  const { allowed } = rateLimit(
    `registration-followup-send:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return { ok: false, error: 'Too many sends — try again in a moment.' };
  }
  return { ok: true, adminId: user.id };
}

export async function sendRegistrationFollowUpAction(
  id: string,
): Promise<RegistrationFollowUpActionResult> {
  if (!ownerId.safeParse(id).success) {
    return { ok: false, error: 'Invalid owner id' };
  }
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const base = ctaBase();
  if (!base) return { ok: false, error: 'Email base URL not configured' };

  const admin = await createServerAdminClient();
  const outcome = await sendToOwner(admin, id, base);

  revalidatePath(adminMenuFollowUpPath(gate.adminId));
  return { ok: true, outcome };
}

const EMPTY_BATCH: RegistrationFollowUpBatchResult = {
  ok: false,
  sent: 0,
  skipped: 0,
  failed: 0,
  capped: 0,
  outcomes: [],
};

const BATCH_CAP = 100;

/**
 * Send to a set of ids, assuming admin is already verified. Deduped, capped at
 * BATCH_CAP with the overflow REPORTED (`capped`), sent sequentially so a burst
 * of parallel Resend POSTs can't trip its rate limiter. Never throws.
 */
async function runBatch(
  adminId: string,
  ids: string[],
  base: string,
): Promise<RegistrationFollowUpBatchResult> {
  const deduped = Array.from(new Set(ids)).filter(
    (value) => ownerId.safeParse(value).success,
  );
  const capped = Math.max(0, deduped.length - BATCH_CAP);
  if (capped > 0) {
    console.warn(
      `[registrationFollowUp:batch] capped ${capped} id(s) over ${BATCH_CAP}`,
    );
  }
  const batch = deduped.slice(0, BATCH_CAP);

  const admin = await createServerAdminClient();
  const outcomes: RegistrationFollowUpOutcome[] = [];
  for (const id of batch) {
    outcomes.push(await sendToOwner(admin, id, base));
  }

  const count = (status: RegistrationFollowUpOutcome['status']) =>
    outcomes.filter((outcome) => outcome.status === status).length;

  revalidatePath(adminMenuFollowUpPath(adminId));
  return {
    ok: true,
    sent: count('sent'),
    skipped: count('skipped'),
    failed: count('failed'),
    capped,
    outcomes,
  };
}

export async function sendRegistrationFollowUpBatchAction(
  ids: string[],
): Promise<RegistrationFollowUpBatchResult> {
  const parsed = batchSchema.safeParse(ids);
  const anyValid = ids.some((value) => ownerId.safeParse(value).success);
  if (!parsed.success && !anyValid) {
    return {
      ...EMPTY_BATCH,
      error: parsed.error.issues[0]?.message ?? 'Invalid',
    };
  }

  const gate = await requireAdmin();
  if (!gate.ok) return { ...EMPTY_BATCH, error: gate.error };

  const base = ctaBase();
  if (!base) return { ...EMPTY_BATCH, error: 'Email base URL not configured' };

  return runBatch(gate.adminId, ids, base);
}

/**
 * "Send to all" over the current FILTER, not a client-supplied id list. The ids
 * are derived server-side (`getOwnersMissingBusinessIds`, itself admin-checked),
 * so the button can never be handed a page-capped or tampered set — it names the
 * filter, the server names the owners.
 */
export async function sendRegistrationFollowUpAllAction(opts: {
  search?: string;
  onlyStarted?: boolean;
}): Promise<RegistrationFollowUpBatchResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ...EMPTY_BATCH, error: gate.error };

  const base = ctaBase();
  if (!base) return { ...EMPTY_BATCH, error: 'Email base URL not configured' };

  const ids = await getOwnersMissingBusinessIds({
    search: opts.search,
    onlyStarted: opts.onlyStarted,
  });
  if (ids.length === 0) {
    return { ...EMPTY_BATCH, ok: true };
  }

  return runBatch(gate.adminId, ids, base);
}
