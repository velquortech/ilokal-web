/**
 * Reset-password email sender (server-only).
 *
 * Delivery is gated by `RESEND_API_KEY`:
 * - key set (prod)  → POST the rendered email to Resend via the shared
 *   `postToResend` (./resend.ts).
 * - key unset (dev) → don't send; log the reset link so a developer can copy it
 *   and walk the full flow locally. This is the local "sandbox".
 *
 * Never throws to the caller: a mail failure must not reveal whether an account
 * exists nor 500 the reset request. Failures are logged and reported via the
 * returned `sent` flag only.
 *
 * `RESEND_API_KEY` / `EMAIL_FROM` are server-only — no `NEXT_PUBLIC_` prefix, so
 * they never reach a client bundle. This module is imported only by route
 * handlers.
 */

import {
  renderResetPasswordEmail,
  type ResetPasswordEmailInput,
} from './templates/resetPassword';
import { postToResend, resendConfig } from './resend';

export interface SendResetEmailInput {
  /** Recipient email address. */
  to: string;
  /** The one-time reset link. */
  url: string;
  /** Optional recipient name for the greeting. */
  recipientName?: string;
  /** Optional overrides forwarded to the template. */
  appName?: ResetPasswordEmailInput['appName'];
  expiresInLabel?: ResetPasswordEmailInput['expiresInLabel'];
}

export interface SendResetEmailResult {
  /** True only when an email was actually dispatched via Resend. */
  sent: boolean;
}

export async function sendResetEmail({
  to,
  url,
  recipientName,
  appName,
  expiresInLabel,
}: SendResetEmailInput): Promise<SendResetEmailResult> {
  const { subject, html, text } = renderResetPasswordEmail({
    url,
    recipientName,
    appName,
    expiresInLabel,
  });

  const config = resendConfig();
  if (!config) {
    // Only surface the (single-use) link in non-production, so a misconfigured
    // prod (missing/placeholder key) can never write live reset tokens to logs.
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        [
          '',
          '┌─ [reset-email] SANDBOX MODE — email not sent (no valid RESEND_API_KEY / EMAIL_FROM)',
          `│  to:   ${to}`,
          `│  link: ${url}`,
          '│  ⚠️  Single-use, expires in 1h. Requesting another reset INVALIDATES this one —',
          '│      always open the MOST RECENT link, and only click it once.',
          '└─',
          '',
        ].join('\n'),
      );
    } else {
      console.error(
        '[reset-email] RESEND_API_KEY/EMAIL_FROM not configured in production — reset email NOT sent.',
      );
    }
    return { sent: false };
  }

  return postToResend(config, '[reset-email]', { to, subject, html, text });
}
