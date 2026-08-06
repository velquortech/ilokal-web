/**
 * Menu follow-up email sender (server-only).
 *
 * Same delivery contract as `sendResetEmail`: gated by `RESEND_API_KEY`, POSTed
 * to Resend over axios in production, log-only in the local sandbox, and it
 * **never throws** — a mail failure must not break the admin action that
 * triggered it. Failures return `sent: false` and are logged with Resend's
 * response body.
 *
 * A parallel sender rather than a refactor of `sendResetEmail`: the two share
 * only the ~10-line Resend POST, but differ in what they log in the sandbox
 * (the reset logs a single-use LINK with security warnings; this logs a
 * marketing nudge), and retrofitting the reset path risks its tested behaviour.
 * The duplication is the POST alone — noted so the next reader doesn't "fix" it
 * by merging two senders with different failure semantics.
 *
 * `RESEND_API_KEY` / `EMAIL_FROM` are server-only (no `NEXT_PUBLIC_` prefix).
 */

import axios from 'axios';
import {
  renderMenuFollowUpEmail,
  type MenuFollowUpEmailInput,
} from './templates/menuFollowUp';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // A real Resend key starts with "re_". A missing/placeholder key or missing
  // EMAIL_FROM = sandbox: don't send, so a misconfigured prod can never attempt
  // a doomed request, and a developer sees what would have gone out.
  const hasRealKey = typeof apiKey === 'string' && apiKey.startsWith('re_');
  if (!hasRealKey || !from) {
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

  try {
    await axios.post(
      RESEND_ENDPOINT,
      { from, to, subject, html, text },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );
    return { sent: true };
  } catch (error) {
    // Resend's body names the real cause (unverified domain, etc.); a bare
    // status hides it. Server-side only — never to the client.
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[menu-followup] Resend send failed (status ${error.response.status}):`,
        JSON.stringify(error.response.data),
      );
    } else {
      console.error(
        '[menu-followup] Resend send failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
    return { sent: false };
  }
}
