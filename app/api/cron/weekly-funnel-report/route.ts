import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { sendFunnelReportEmail } from '@/app/api/emails/sendFunnelReport';
import { ROUTES } from '@/config/routeConfig';
import { readRegistrationFunnel } from '@/lib/api/admin/analyticsQuery';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { createAnalyticsSupabaseClient } from '@/supabase/server';

const REPORT_DAYS = 7;
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/**
 * GET /api/cron/weekly-funnel-report — Monday 08:00 Manila (vercel.json).
 *
 * Emails staff the app-registration funnel for the last 7 days. Vercel Cron
 * calls it with `Authorization: Bearer $CRON_SECRET`; nothing else gets in, and
 * an unset secret refuses everyone rather than accepting a guessable value.
 *
 * Every way it can fail to send is a non-2xx, so it shows in the cron log:
 * no recipients configured (500), the report read failing (500 — never a week
 * of zeros in staff inboxes), Resend rejecting it in production (502).
 *
 *   CRON_SECRET               shared with Vercel Cron
 *   FUNNEL_REPORT_RECIPIENTS  comma-separated staff addresses
 *   NEXT_PUBLIC_APP_URL       for the dashboard link (omitted if unset)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = (process.env.FUNNEL_REPORT_RECIPIENTS ?? '')
    .split(/[,;\s]+/)
    .filter((address) => EMAIL.test(address));
  if (to.length === 0) {
    console.error(
      '[weekly-funnel-report] FUNNEL_REPORT_RECIPIENTS has no valid address — report not sent.',
    );
    return NextResponse.json({ error: 'No recipients' }, { status: 500 });
  }

  try {
    // Service role: there is no session on a cron call. The report admits it.
    const funnel = await readRegistrationFunnel(
      await createAnalyticsSupabaseClient(),
      REPORT_DAYS,
    );
    if (funnel.failed) {
      return NextResponse.json(
        { error: 'Report unavailable' },
        { status: 500 },
      );
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? '')
      .trim()
      .replace(/\/+$/, '');
    const { sent } = await sendFunnelReportEmail({
      to,
      funnel,
      dashboardUrl: base ? `${base}${ROUTES.DASHBOARD.ADMIN}` : undefined,
    });

    if (!sent && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }
    return NextResponse.json({ sent, recipients: to.length });
  } catch (error) {
    console.error('[weekly-funnel-report]', formatErrorForLog(error));
    return NextResponse.json({ error: 'Report failed' }, { status: 500 });
  }
}

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
