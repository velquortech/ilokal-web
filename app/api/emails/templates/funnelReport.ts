/**
 * Weekly app-registration report email (server-only).
 *
 * Pure renderer, like the other templates: the funnel in, subject + HTML +
 * plain text out — no sending, no I/O. Internal mail for staff, so the shell
 * is the brand's (white card on grey, iLokal red wordmark) without the
 * shopper-facing flourishes.
 *
 * The step names and share wording come from FUNNEL_STEPS, the same source as
 * the dashboard card, so the email and the dashboard never describe one number
 * two ways. A week nobody used the link says so in words — never a table of
 * zeros.
 */

import type { RegistrationFunnel } from '@/lib/types';
import { FUNNEL_STEPS, funnelShare } from '@/lib/utils/registrationFunnel';

export interface FunnelReportEmailInput {
  funnel: RegistrationFunnel;
  /** The admin dashboard, absolute. Omitted when the app URL is unknown. */
  dashboardUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT = 'font-family:Arial,Helvetica,sans-serif;';

export function renderFunnelReportEmail({
  funnel,
  dashboardUrl,
}: FunnelReportEmailInput): RenderedEmail {
  const { days, sources, totals } = funnel;
  const period = `last ${days} days`;
  const empty = sources.length === 0;
  const finished = totals.completed;

  const subject = empty
    ? `iLokal app registrations, ${period}: no activity`
    : `iLokal app registrations, ${period}: ${finished} ${
        finished === 1 ? 'shop' : 'shops'
      } finished`;

  const emptyLine = `No one opened the app’s “List your business” link in the ${period}.`;

  const steps = FUNNEL_STEPS.map((step, i) => {
    const value = totals[step.key];
    const pct =
      i > 0 ? funnelShare(value, totals[FUNNEL_STEPS[i - 1].key]) : null;
    return {
      label: step.label,
      value,
      note: pct ? `${pct} ${step.ofPrevious}` : '',
    };
  });

  // ── Plain text ──────────────────────────────────────────────────────────
  const textLines = [`iLokal app registrations — ${period}`, ''];
  if (empty) {
    textLines.push(emptyLine);
  } else {
    for (const s of steps) {
      textLines.push(`${s.label}: ${s.value}${s.note ? ` (${s.note})` : ''}`);
    }
    textLines.push('', 'By place in the app:');
    for (const src of sources) {
      textLines.push(
        `${src.label}: ${src.visitors} opened, ${src.signups} ${src.signups === 1 ? 'account' : 'accounts'}, ${src.started} started, ${src.completed} finished`,
      );
    }
  }
  if (dashboardUrl) textLines.push('', `Dashboard: ${dashboardUrl}`);

  // ── HTML ────────────────────────────────────────────────────────────────
  const cell = `${FONT}font-size:14px;color:#1A1A1A;padding:8px 0;border-bottom:1px solid #E5E7EB;`;
  const body = empty
    ? `<p style="${FONT}font-size:15px;line-height:24px;color:#6B7280;margin:0;">${escapeHtml(emptyLine)}</p>`
    : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${steps
          .map(
            (s) => `<tr>
          <td style="${cell}">${escapeHtml(s.label)}</td>
          <td align="right" style="${cell}font-weight:bold;font-size:18px;">${s.value.toLocaleString()}</td>
          <td align="right" style="${cell}color:#6B7280;font-size:12px;padding-left:12px;">${escapeHtml(s.note)}</td>
        </tr>`,
          )
          .join('')}
      </table>
      <p style="${FONT}font-size:13px;font-weight:bold;color:#1A1A1A;margin:28px 0 4px;">By place in the app</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="${cell}color:#6B7280;font-size:12px;">Where</td>
          ${FUNNEL_STEPS.map(
            (step) =>
              `<td align="right" style="${cell}color:#6B7280;font-size:12px;">${escapeHtml(step.label)}</td>`,
          ).join('')}
        </tr>
        ${sources
          .map(
            (src) => `<tr>
          <td style="${cell}">${escapeHtml(src.label)}</td>
          ${FUNNEL_STEPS.map(
            (step) =>
              `<td align="right" style="${cell}">${src[step.key].toLocaleString()}</td>`,
          ).join('')}
        </tr>`,
          )
          .join('')}
      </table>`;

  const link = dashboardUrl
    ? `<p style="${FONT}font-size:14px;margin:28px 0 0;"><a href="${escapeHtml(dashboardUrl)}" style="color:#A80004;font-weight:bold;">Open the admin dashboard →</a></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F3F4F6;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:14px;border:1px solid #E5E7EB;">
    <tr><td style="padding:20px 32px;border-bottom:1px solid #E5E7EB;${FONT}font-size:22px;font-weight:bold;color:#D70005;">iLokal</td></tr>
    <tr><td style="padding:28px 32px 32px;">
      <p style="${FONT}font-size:20px;font-weight:bold;color:#1A1A1A;margin:0 0 4px;">App registrations</p>
      <p style="${FONT}font-size:14px;color:#6B7280;margin:0 0 20px;">Owners who tapped “List your business” in the mobile app — ${escapeHtml(period)}</p>
      ${body}
      ${link}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  return { subject, html, text: textLines.join('\n') };
}
