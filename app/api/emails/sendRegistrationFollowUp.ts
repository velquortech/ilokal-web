/**
 * Registration follow-up email sender (server-only).
 *
 * Same delivery contract as `sendMenuFollowUp`: gated by `RESEND_API_KEY`,
 * POSTed to Resend over axios in production, log-only in the local sandbox, and
 * it **never throws** — a mail failure must not break the admin action that
 * triggered it. Failures return `sent: false` and are logged with Resend's
 * response body, which is what names the real cause (an unverified sending
 * domain, most often).
 *
 * The ~15-line Resend POST is shared in shape with `sendMenuFollowUp` and
 * `sendResetEmail` but not extracted: the three differ in what they log in the
 * sandbox and in their failure semantics (the reset path is load-bearing for
 * account recovery). Noted so the next reader doesn't merge senders whose
 * failure handling is deliberately different. The EMAIL MARKUP, which is the
 * part that actually drifts, is shared — see `templates/shell.ts`.
 *
 * `RESEND_API_KEY` / `EMAIL_FROM` are server-only (no `NEXT_PUBLIC_` prefix).
 */

import axios from 'axios';
import {
  renderRegistrationFollowUpEmail,
  type RegistrationFollowUpEmailInput,
} from './templates/registrationFollowUp';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendRegistrationFollowUpInput extends RegistrationFollowUpEmailInput {
  /** Recipient email address. */
  to: string;
}

export interface SendRegistrationFollowUpResult {
  /** True only when an email was actually dispatched via Resend. */
  sent: boolean;
}

export async function sendRegistrationFollowUpEmail({
  to,
  ...templateInput
}: SendRegistrationFollowUpInput): Promise<SendRegistrationFollowUpResult> {
  const { subject, html, text } =
    renderRegistrationFollowUpEmail(templateInput);

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
          '┌─ [registration-followup] SANDBOX MODE — email not sent (no valid RESEND_API_KEY / EMAIL_FROM)',
          `│  to:      ${to}`,
          `│  subject: ${subject}`,
          '└─',
          '',
        ].join('\n'),
      );
    } else {
      console.error(
        '[registration-followup] RESEND_API_KEY/EMAIL_FROM not configured in production — follow-up email NOT sent.',
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
    // Resend's body names the real cause; a bare status hides it. Server-side
    // only — never to the client.
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[registration-followup] Resend send failed (status ${error.response.status}):`,
        JSON.stringify(error.response.data),
      );
    } else {
      console.error(
        '[registration-followup] Resend send failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
    return { sent: false };
  }
}
