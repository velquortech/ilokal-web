'use server';

/**
 * Menu follow-up — admin send actions.
 *
 * Emails the owner of a verified shop that has no live menu, nudging them to
 * add one. Every export is a publicly invocable endpoint, so each proves the
 * caller is admin, re-verifies the target at send time (the list the admin
 * clicked from is a hint, not a gate), and rate-limits — Server-Action POSTs
 * never reach the proxy limiter, and the batch action fans out N emails.
 *
 * The re-check is `admin_business_followup_target`: between seeing the list and
 * clicking send, an owner may have added a menu, so the shop is re-read one at
 * a time and refused unless it is STILL verified, non-archived and menuless —
 * the same "re-check eligibility, don't trust the source list" the coupon
 * redeem route applies.
 *
 * Idempotent within a cooldown: a shop reminded inside the window is skipped, so
 * a double-click (or an over-eager "send to all") can't email the same owner
 * twice. The window is env-tunable; the alternative is one-shot (never re-nudge)
 * — see `.claude/MENU_FOLLOWUP.md` MF14.
 */

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { createServerAdminClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { adminPath, businessProductCataloguesPath } from '@/config/routeConfig';
import { sendMenuFollowUpEmail } from '@/app/api/emails/sendMenuFollowUp';
import { z } from 'zod';

const businessId = z.guid('Invalid business id');
// No `.max` here on purpose: an over-cap list is not rejected, it is sent up to
// the cap and the overflow is REPORTED (`capped`). The floor is the only hard
// rule.
const batchSchema = z.array(businessId).min(1, 'Nothing selected');

const RATE_LIMIT = Number(process.env.ADMIN_ACTION_RATE_LIMIT ?? 20);
const RATE_WINDOW_MS = Number(
  process.env.ADMIN_ACTION_RATE_WINDOW_MS ?? 60_000,
);
/** Skip a shop reminded inside this window (default 14 days). Env-tunable. */
const COOLDOWN_MS =
  Number(process.env.MENU_REMINDER_COOLDOWN_HOURS ?? 24 * 14) * 60 * 60 * 1000;

/** The per-shop outcome — the shape the batch reports counts over. */
export type FollowUpOutcome =
  | { status: 'sent'; businessId: string }
  | { status: 'skipped'; businessId: string; reason: string }
  | { status: 'failed'; businessId: string; reason: string };

export interface FollowUpActionResult {
  ok: boolean;
  outcome?: FollowUpOutcome;
  error?: string;
}

export interface FollowUpBatchResult {
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  /** How many ids were dropped for exceeding the per-run cap. */
  capped: number;
  outcomes: FollowUpOutcome[];
  error?: string;
}

/** The absolute CTA link. Fail-closed in production: no base, no send. */
function ctaBase(): string | null {
  const base = (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '').replace(
    /\/+$/,
    '',
  );
  if (base) return base;
  // Dev sandbox logs the email rather than sending, so a localhost link is fine
  // there; a missing base in production would build a broken relative CTA.
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null;
}

/**
 * Send to ONE shop, assuming admin is already verified. Returns an outcome —
 * never throws — so the batch loop can keep going past a single failure.
 *
 * `admin` is a service-role client (RLS-bypassing): the caller has proven admin
 * before creating it.
 */
async function sendToBusiness(
  admin: Awaited<ReturnType<typeof createServerAdminClient>>,
  id: string,
  base: string,
): Promise<FollowUpOutcome> {
  const { data, error } = await admin.rpc('admin_business_followup_target', {
    p_business_id: id,
  });
  if (error) {
    console.error('[menuFollowUp:target]', id, error);
    return { status: 'failed', businessId: id, reason: 'LOOKUP_FAILED' };
  }

  const target = Array.isArray(data) ? data[0] : undefined;
  if (!target)
    return { status: 'skipped', businessId: id, reason: 'NOT_FOUND' };

  // Re-checked at send time — the list is not trusted.
  if (!target.is_sendable) {
    return {
      status: 'skipped',
      businessId: id,
      reason: target.has_live_menu ? 'ALREADY_HAS_MENU' : 'NOT_ELIGIBLE',
    };
  }
  if (!target.owner_email) {
    return { status: 'skipped', businessId: id, reason: 'NO_EMAIL' };
  }
  // Cooldown = idempotency: a double-click or a re-run inside the window is a
  // no-op rather than a second email.
  if (
    target.menu_reminder_sent_at &&
    Date.now() - new Date(target.menu_reminder_sent_at).getTime() < COOLDOWN_MS
  ) {
    return { status: 'skipped', businessId: id, reason: 'RECENTLY_SENT' };
  }

  const { sent } = await sendMenuFollowUpEmail({
    to: target.owner_email,
    shopName: target.shop_name,
    ctaUrl: `${base}${businessProductCataloguesPath(id)}`,
    offeringNoun: target.offering_noun,
    offeringPlural: target.offering_plural,
    recipientName: target.owner_name ?? undefined,
  });

  if (!sent) {
    // Not stamped: a send that never left must be retryable, or the owner is
    // never reminded.
    return { status: 'failed', businessId: id, reason: 'SEND_FAILED' };
  }

  const { error: stampError } = await admin
    .from('businesses')
    .update({ menu_reminder_sent_at: new Date().toISOString() })
    .eq('id', id);
  if (stampError) {
    // The email went out; the stamp is best-effort. Log, but the send counts —
    // reporting a failure here would invite a duplicate resend.
    console.error('[menuFollowUp:stamp]', id, stampError);
  }

  return { status: 'sent', businessId: id };
}

/** Admin gate shared by both actions. Returns the admin id or an error. */
async function requireAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return { ok: false, error: 'Unauthorized' };
  }
  const { allowed } = rateLimit(
    `menu-followup-send:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return { ok: false, error: 'Too many sends — try again in a moment.' };
  }
  return { ok: true, adminId: user.id };
}

export async function sendMenuFollowUpAction(
  id: string,
): Promise<FollowUpActionResult> {
  if (!businessId.safeParse(id).success) {
    return { ok: false, error: 'Invalid business id' };
  }
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const base = ctaBase();
  if (!base) return { ok: false, error: 'Email base URL not configured' };

  const admin = await createServerAdminClient();
  const outcome = await sendToBusiness(admin, id, base);

  revalidatePath(adminPath(gate.adminId, 'menu-follow-up'));
  return { ok: true, outcome };
}

export async function sendMenuFollowUpBatchAction(
  ids: string[],
): Promise<FollowUpBatchResult> {
  const empty: FollowUpBatchResult = {
    ok: false,
    sent: 0,
    skipped: 0,
    failed: 0,
    capped: 0,
    outcomes: [],
  };

  const parsed = batchSchema.safeParse(ids);
  // A list longer than the cap is not rejected outright — the first 100 are
  // sent and the overflow is REPORTED, never silently dropped.
  const deduped = Array.from(new Set(ids)).filter(
    (v) => businessId.safeParse(v).success,
  );
  if (!parsed.success && deduped.length === 0) {
    return { ...empty, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  }

  const gate = await requireAdmin();
  if (!gate.ok) return { ...empty, error: gate.error };

  const base = ctaBase();
  if (!base) return { ...empty, error: 'Email base URL not configured' };

  const CAP = 100;
  const capped = Math.max(0, deduped.length - CAP);
  if (capped > 0) {
    console.warn(`[menuFollowUp:batch] capped ${capped} id(s) over ${CAP}`);
  }
  const batch = deduped.slice(0, CAP);

  const admin = await createServerAdminClient();
  const outcomes: FollowUpOutcome[] = [];
  // Sequential on purpose: a burst of parallel Resend POSTs is what its own
  // rate limiter would throttle, and the volume here is admin-scale, not hot.
  for (const id of batch) {
    outcomes.push(await sendToBusiness(admin, id, base));
  }

  const count = (status: FollowUpOutcome['status']) =>
    outcomes.filter((o) => o.status === status).length;

  revalidatePath(adminPath(gate.adminId, 'menu-follow-up'));
  return {
    ok: true,
    sent: count('sent'),
    skipped: count('skipped'),
    failed: count('failed'),
    capped,
    outcomes,
  };
}
