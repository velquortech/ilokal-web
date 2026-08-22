/**
 * Registration follow-up email template (server-only).
 *
 * For the cohort measured on 2026-08-22: owners who created an account and
 * never finished registering a shop — 49% of all owner accounts. Until the
 * admin follow-up surface shipped, the product had no way to reach them at all.
 *
 * Pure renderer: shop-less by definition, so unlike the menu nudge it has no
 * shop name to lead with; the owner's own name is all the personalisation
 * available. Markup comes from the shared `./shell`.
 *
 * ⚠️ The CTA can only be the wizard's entry point, NOT a resume deep link.
 * Registration state lives in `localStorage` + IndexedDB in whichever browser
 * the owner started in — there is no server-side draft to resume, which is the
 * whole subject of Phase 1 in `.claude/REGISTRATION_FUNNEL.md`. So the copy
 * deliberately does not promise their answers are saved: it says "pick up where
 * you left off" only when we know they got somewhere (`furthestStep`), because
 * on their original device the cache genuinely does restore. Promising more than
 * that is how a nudge becomes a second bad experience.
 */

import { escapeHtml, renderEmailShell, type RenderedEmail } from './shell';

export interface RegistrationFollowUpEmailInput {
  /** Where "Finish your registration" points. App-owned URL. */
  ctaUrl: string;
  /** Optional owner name for a friendlier greeting. */
  recipientName?: string;
  /**
   * How far they got, from `owner_events`. Undefined = we never saw them start
   * (the funnel table only began recording on 2026-08-15), which is a DIFFERENT
   * message from "they started and stopped" — never render a step line we
   * cannot substantiate.
   */
  furthestStep?: number;
  /** Total steps in the wizard, so "step 4 of 6" reads correctly. */
  totalSteps?: number;
  /** Display name for the product (defaults to "iLokal"). */
  appName?: string;
}

export type { RenderedEmail } from './shell';

export function renderRegistrationFollowUpEmail({
  ctaUrl,
  recipientName,
  furthestStep,
  totalSteps = 6,
  appName = 'iLokal',
}: RegistrationFollowUpEmailInput): RenderedEmail {
  const safeApp = escapeHtml(appName);
  const safeName = recipientName ? escapeHtml(recipientName) : 'there';

  // Only claim progress when a real step was recorded, and only when it is
  // inside the wizard: a stale cached step from an older, longer flow could
  // otherwise render "step 7 of 6".
  const hasProgress =
    typeof furthestStep === 'number' &&
    Number.isFinite(furthestStep) &&
    furthestStep >= 1 &&
    furthestStep <= totalSteps;

  const subject = hasProgress
    ? `You're ${totalSteps - furthestStep!} step${totalSteps - furthestStep! === 1 ? '' : 's'} from listing your shop on ${appName}`
    : `Finish listing your shop on ${appName}`;

  const progressLine = hasProgress
    ? `You reached step ${furthestStep} of ${totalSteps}. Open the form on the same device and browser and your answers should still be there.`
    : `It only takes a few minutes, and you can stop and come back.`;

  const text = [
    `Hi ${recipientName ?? 'there'},`,
    '',
    `You created an ${appName} account but haven't listed your shop yet — so`,
    'shoppers in Iloilo City cannot find you on the app.',
    '',
    progressLine,
    '',
    'Finish here:',
    ctaUrl,
    '',
    `Once you're live, shoppers can browse what you sell, follow your shop and`,
    'redeem the deals you post.',
    '',
    `— ${appName} · Made in Iloilo City`,
  ].join('\n');

  const html = renderEmailShell({
    subject,
    preheader: `You created an ${appName} account but your shop is not listed yet. ${hasProgress ? `You reached step ${furthestStep} of ${totalSteps}.` : 'It only takes a few minutes.'}`,
    appName,
    icon: '🏪',
    headingHtml: hasProgress
      ? 'Pick up where you left off'
      : 'Your shop is not listed yet',
    introHtml: `Hi ${safeName}, you created an ${safeApp} account but haven't listed your shop yet — so shoppers in Iloilo City cannot find you. ${escapeHtml(progressLine)}`,
    ctaLabel: hasProgress ? 'Finish your registration' : 'List your shop',
    ctaUrl,
    ctaSubtext: 'You can stop and come back at any point.',
    valueNoteHtml: `<strong style="color:#1A1A1A;">Why it matters:</strong> a listed shop is browsable in the ${safeApp} app — shoppers can see what you sell, follow you for updates, and redeem the deals you post. An unlisted shop is invisible.`,
    footerReason: `You're receiving this because you created a business account on ${appName}.`,
  });

  return { subject, html, text };
}
