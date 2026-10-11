/**
 * The Resend delivery every email sender shares (server-only).
 *
 * Holds only what the senders had identical: the "is sending configured" gate,
 * the POST, and its failure logging. What legitimately differs — what each
 * sender logs in the sandbox (the reset email surfaces a single-use link with
 * warnings; the others don't) and its production-misconfiguration message —
 * stays in each sender, which is why this is a helper and not a merged sender.
 *
 * Contract, pinned by __tests__/resendSenders.contract.test.ts: never throws;
 * `sent: true` only when Resend accepted the request; a failure is logged with
 * the sender's tag and Resend's response body (it names the real cause, e.g. an
 * unverified domain), server-side only.
 *
 * `RESEND_API_KEY` / `EMAIL_FROM` are server-only (no `NEXT_PUBLIC_` prefix).
 */

import axios from 'axios';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface ResendConfig {
  apiKey: string;
  from: string;
}

export interface ResendEmail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * The credentials to send with, or `null` for sandbox mode. A real Resend key
 * starts with "re_"; a missing or placeholder key, or a missing EMAIL_FROM,
 * means don't send — so a misconfigured deploy can never attempt a doomed
 * request.
 */
export function resendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  return typeof apiKey === 'string' && apiKey.startsWith('re_') && from
    ? { apiKey, from }
    : null;
}

/** POST one email to Resend. `tag` prefixes the failure log, e.g. "[reset-email]". */
export async function postToResend(
  { apiKey, from }: ResendConfig,
  tag: string,
  { to, subject, html, text }: ResendEmail,
): Promise<{ sent: boolean }> {
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
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `${tag} Resend send failed (status ${error.response.status}):`,
        JSON.stringify(error.response.data),
      );
    } else {
      console.error(
        `${tag} Resend send failed:`,
        error instanceof Error ? error.message : 'unknown error',
      );
    }
    return { sent: false };
  }
}
