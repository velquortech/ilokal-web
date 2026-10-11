/**
 * Weekly app-registration report sender (server-only).
 *
 * The same delivery contract as sendMenuFollowUp / sendResetEmail: gated by
 * `RESEND_API_KEY` + `EMAIL_FROM`, POSTed to Resend over axios, log-only in the
 * sandbox, and it **never throws** — the caller reads `sent`. One email to the
 * whole recipient list (staff see who else gets it).
 *
 * Its own copy of the ~10-line Resend POST, as the other two keep theirs: the
 * senders differ in what the sandbox logs and how failure is handled. This is
 * the third copy — the point at which a shared `postToResend` earns its keep.
 */

import axios from 'axios';

import type { RegistrationFunnel } from '@/lib/types';
import { renderFunnelReportEmail } from './templates/funnelReport';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendFunnelReportInput {
  to: string[];
  funnel: RegistrationFunnel;
  dashboardUrl?: string;
}

export async function sendFunnelReportEmail({
  to,
  funnel,
  dashboardUrl,
}: SendFunnelReportInput): Promise<{ sent: boolean }> {
  const { subject, html, text } = renderFunnelReportEmail({
    funnel,
    dashboardUrl,
  });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const hasRealKey = typeof apiKey === 'string' && apiKey.startsWith('re_');

  if (!hasRealKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        [
          '',
          '┌─ [funnel-report] SANDBOX MODE — email not sent (no valid RESEND_API_KEY / EMAIL_FROM)',
          `│  to:      ${to.join(', ')}`,
          `│  subject: ${subject}`,
          ...text.split('\n').map((line) => `│  ${line}`),
          '└─',
          '',
        ].join('\n'),
      );
    } else {
      console.error(
        '[funnel-report] RESEND_API_KEY/EMAIL_FROM not configured in production — weekly report NOT sent.',
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
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[funnel-report] Resend send failed (status ${error.response.status}):`,
        JSON.stringify(error.response.data),
      );
    } else {
      console.error(
        '[funnel-report] Resend send failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
    return { sent: false };
  }
}
