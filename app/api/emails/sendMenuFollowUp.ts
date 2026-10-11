/**
 * Menu follow-up email sender (server-only).
 *
 * Same delivery contract as `sendResetEmail`: gated by `RESEND_API_KEY`, sent
 * through the shared `postToResend` (./resend.ts) in production, log-only in
 * the local sandbox, and it **never throws** — a mail failure must not break
 * the admin action that triggered it. Failures return `sent: false` and are
 * logged with Resend's response body.
 *
 * A separate sender rather than one merged with `sendResetEmail`: they share
 * the delivery (./resend.ts) but differ in what they log in the sandbox (the
 * reset logs a single-use LINK with security warnings; this logs a marketing
 * nudge) — so only the identical part is shared.
 *
 * `RESEND_API_KEY` / `EMAIL_FROM` are server-only (no `NEXT_PUBLIC_` prefix).
 */

import {
  renderMenuFollowUpEmail,
  type MenuFollowUpEmailInput,
} from './templates/menuFollowUp';
import { postToResend, resendConfig } from './resend';

export interface SendMenuFollowUpInput extends MenuFollowUpEmailInput {
  /** Recipient email address. */
  to: string;
}

export interface SendMenuFollowUpResult {
  /** True only when an email was actually dispatched via Resend. */
  sent: boolean;
}

export async function sendMenuFollowUpEmail({
  to,
  ...templateInput
}: SendMenuFollowUpInput): Promise<SendMenuFollowUpResult> {
  const { subject, html, text } = renderMenuFollowUpEmail(templateInput);

  const config = resendConfig();
  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        [
          '',
          '┌─ [menu-followup] SANDBOX MODE — email not sent (no valid RESEND_API_KEY / EMAIL_FROM)',
          `│  to:      ${to}`,
          `│  subject: ${subject}`,
          '└─',
          '',
        ].join('\n'),
      );
    } else {
      console.error(
        '[menu-followup] RESEND_API_KEY/EMAIL_FROM not configured in production — follow-up email NOT sent.',
      );
    }
    return { sent: false };
  }

  return postToResend(config, '[menu-followup]', { to, subject, html, text });
}
