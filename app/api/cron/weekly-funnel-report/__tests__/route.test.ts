/**
 * GET /api/cron/weekly-funnel-report — Vercel Cron's Monday trigger.
 *
 * Contract: only a caller holding CRON_SECRET gets in; a misconfiguration or a
 * failed read fails LOUDLY (non-2xx, nothing sent) so it shows in the cron log
 * instead of mailing staff a week of zeros; otherwise one email covering the
 * last 7 days goes to the configured recipients.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/cron/weekly-funnel-report/route';
import { readRegistrationFunnel } from '@/lib/api/admin/analyticsQuery';
import { sendFunnelReportEmail } from '@/app/api/emails/sendFunnelReport';
import { createAnalyticsSupabaseClient } from '@/supabase/server';
import * as Sentry from '@sentry/nextjs';

vi.mock('@/supabase/server', () => ({
  createAnalyticsSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/api/admin/analyticsQuery', () => ({
  readRegistrationFunnel: vi.fn(),
}));
vi.mock('@/app/api/emails/sendFunnelReport', () => ({
  sendFunnelReportEmail: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'check-in-1'),
  flush: vi.fn(() => Promise.resolve(true)),
}));

const SECRET = 'cron-secret-123';
const FUNNEL = {
  days: 7,
  failed: false,
  sources: [],
  totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
};
const ENV = { ...process.env };

function call(auth?: string) {
  return GET(
    new NextRequest('https://ilokal.shop/api/cron/weekly-funnel-report', {
      headers: auth ? { authorization: auth } : {},
    }),
  );
}

describe('GET /api/cron/weekly-funnel-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.CRON_SECRET = SECRET;
    process.env.FUNNEL_REPORT_RECIPIENTS =
      'ops@example.com, founder@example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://ilokal.shop/';
    (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValue({});
    (readRegistrationFunnel as unknown as Mock).mockResolvedValue(FUNNEL);
    (sendFunnelReportEmail as unknown as Mock).mockResolvedValue({
      sent: true,
    });
  });

  afterEach(() => {
    process.env = { ...ENV };
  });

  it('sends the last 7 days to every configured recipient', async () => {
    const res = await call(`Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(readRegistrationFunnel).toHaveBeenCalledWith(expect.anything(), 7);
    expect(sendFunnelReportEmail).toHaveBeenCalledWith({
      to: ['ops@example.com', 'founder@example.com'],
      funnel: FUNNEL,
      dashboardUrl: 'https://ilokal.shop/admin',
    });
  });

  it('rejects a caller without the secret, before reading anything', async () => {
    for (const auth of [undefined, 'Bearer wrong', SECRET]) {
      const res = await call(auth);
      expect(res.status).toBe(401);
    }
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
    expect(sendFunnelReportEmail).not.toHaveBeenCalled();
  });

  it('refuses everyone when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const res = await call('Bearer undefined');

    expect(res.status).toBe(401);
    expect(sendFunnelReportEmail).not.toHaveBeenCalled();
  });

  it('fails loudly with no valid recipients, without reading or sending', async () => {
    process.env.FUNNEL_REPORT_RECIPIENTS = ' , not-an-email ';

    const res = await call(`Bearer ${SECRET}`);

    expect(res.status).toBe(500);
    expect(readRegistrationFunnel).not.toHaveBeenCalled();
    expect(sendFunnelReportEmail).not.toHaveBeenCalled();
  });

  it('fails loudly on a broken read rather than mailing a week of zeros', async () => {
    (readRegistrationFunnel as unknown as Mock).mockResolvedValue({
      ...FUNNEL,
      failed: true,
    });

    const res = await call(`Bearer ${SECRET}`);

    expect(res.status).toBe(500);
    expect(sendFunnelReportEmail).not.toHaveBeenCalled();
  });

  it('reports a production send failure as a failed run', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    (sendFunnelReportEmail as unknown as Mock).mockResolvedValue({
      sent: false,
    });

    const res = await call(`Bearer ${SECRET}`);

    expect(res.status).toBe(502);
    vi.unstubAllEnvs();
  });

  describe('Sentry cron monitor', () => {
    const statuses = () =>
      (Sentry.captureCheckIn as unknown as Mock).mock.calls.map(
        (c) => c[0].status,
      );

    it('checks in at the start and reports ok when the email went out', async () => {
      await call(`Bearer ${SECRET}`);

      expect(statuses()).toEqual(['in_progress', 'ok']);
      const [[start, config], [end]] = (
        Sentry.captureCheckIn as unknown as Mock
      ).mock.calls;
      expect(start.monitorSlug).toBe('weekly-funnel-report');
      expect(config.schedule).toEqual({ type: 'crontab', value: '0 0 * * 1' });
      expect(end).toMatchObject({ checkInId: 'check-in-1', status: 'ok' });
      // Serverless: the check-in must be sent before the function freezes.
      expect(Sentry.flush).toHaveBeenCalled();
    });

    it('reports error when the run fails, so Sentry alerts', async () => {
      (readRegistrationFunnel as unknown as Mock).mockResolvedValue({
        ...FUNNEL,
        failed: true,
      });

      await call(`Bearer ${SECRET}`);

      expect(statuses()).toEqual(['in_progress', 'error']);
    });

    it('reports error on a misconfiguration too', async () => {
      process.env.FUNNEL_REPORT_RECIPIENTS = '';

      await call(`Bearer ${SECRET}`);

      expect(statuses()).toEqual(['in_progress', 'error']);
    });

    it('never checks in for a caller without the secret', async () => {
      // A stranger must not be able to mark the job ok — and with
      // CRON_SECRET unset, the real cron never checks in either, which
      // Sentry reports as a MISSED run.
      await call('Bearer wrong');
      delete process.env.CRON_SECRET;
      await call('Bearer undefined');

      expect(Sentry.captureCheckIn).not.toHaveBeenCalled();
    });
  });
});
