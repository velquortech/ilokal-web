/**
 * Weekly app-registration report sender (server-only).
 *
 * The same delivery contract as sendMenuFollowUp / sendResetEmail: gated by
 * `RESEND_API_KEY` + `EMAIL_FROM`, sent through the shared `postToResend`
 * (./resend.ts), log-only in the sandbox, and it **never throws** — the caller
 * reads `sent`. One email to the whole recipient list (staff see who else gets
 * it). Only the sandbox log below is this sender's own.
 */

import type { RegistrationFunnel } from '@/lib/types';
import { renderFunnelReportEmail } from './templates/funnelReport';
import { postToResend, resendConfig } from './resend';

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

  const config = resendConfig();
  if (!config) {
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

  return postToResend(config, '[funnel-report]', { to, subject, html, text });
}
