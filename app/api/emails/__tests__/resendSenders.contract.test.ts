/**
 * The three Resend senders' delivery + failure contract, pinned exactly.
 *
 * Written against the senders BEFORE their shared POST was extracted, so the
 * extraction is held to byte-identical behaviour: the same request, the same
 * two failure log lines (with Resend's response body, or the error message),
 * the same production-misconfiguration error, the same `sent` flag — and the
 * sandbox branch still each sender's own.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import { sendResetEmail } from '@/app/api/emails/sendResetEmail';
import { sendMenuFollowUpEmail } from '@/app/api/emails/sendMenuFollowUp';
import { sendFunnelReportEmail } from '@/app/api/emails/sendFunnelReport';

vi.mock('axios', () => ({
  default: { post: vi.fn(), isAxiosError: vi.fn() },
}));

const post = vi.mocked(axios.post);
const isAxiosError = vi.mocked(axios.isAxiosError);
const ENV = {
  key: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
};

const SENDERS = [
  {
    name: 'sendResetEmail',
    tag: '[reset-email]',
    to: 'user@example.com',
    send: () =>
      sendResetEmail({ to: 'user@example.com', url: 'https://x/reset' }),
    prodMisconfig:
      '[reset-email] RESEND_API_KEY/EMAIL_FROM not configured in production — reset email NOT sent.',
  },
  {
    name: 'sendMenuFollowUpEmail',
    tag: '[menu-followup]',
    to: 'owner@example.com',
    send: () =>
      sendMenuFollowUpEmail({
        to: 'owner@example.com',
        shopName: 'Shop',
        ctaUrl: 'https://x/menu',
      }),
    prodMisconfig:
      '[menu-followup] RESEND_API_KEY/EMAIL_FROM not configured in production — follow-up email NOT sent.',
  },
  {
    name: 'sendFunnelReportEmail',
    tag: '[funnel-report]',
    to: ['ops@example.com', 'founder@example.com'],
    send: () =>
      sendFunnelReportEmail({
        to: ['ops@example.com', 'founder@example.com'],
        funnel: {
          days: 7,
          failed: false,
          sources: [],
          totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
        },
      }),
    prodMisconfig:
      '[funnel-report] RESEND_API_KEY/EMAIL_FROM not configured in production — weekly report NOT sent.',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'iLokal <hi@ilokal.shop>';
});

afterEach(() => {
  process.env.RESEND_API_KEY = ENV.key;
  process.env.EMAIL_FROM = ENV.from;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe.each(SENDERS)('$name — Resend contract', (s) => {
  it('POSTs exactly this request and reports sent', async () => {
    post.mockResolvedValue({ data: { id: 'x' } });

    expect(await s.send()).toEqual({ sent: true });

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, config] = post.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(Object.keys(body as object).sort()).toEqual([
      'from',
      'html',
      'subject',
      'text',
      'to',
    ]);
    expect(body).toMatchObject({ from: 'iLokal <hi@ilokal.shop>', to: s.to });
    expect(config).toEqual({
      headers: {
        Authorization: 'Bearer re_test_key',
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  });

  it('logs Resend’s status and body on an HTTP failure, never throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    isAxiosError.mockReturnValue(true);
    post.mockRejectedValue({
      response: { status: 422, data: { message: 'domain not verified' } },
    });

    expect(await s.send()).toEqual({ sent: false });
    expect(error).toHaveBeenCalledWith(
      `${s.tag} Resend send failed (status 422):`,
      '{"message":"domain not verified"}',
    );
  });

  it('logs the error message on a network failure, never throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    isAxiosError.mockReturnValue(false);
    post.mockRejectedValue(new Error('socket hang up'));

    expect(await s.send()).toEqual({ sent: false });
    expect(error).toHaveBeenCalledWith(
      `${s.tag} Resend send failed:`,
      'socket hang up',
    );
  });

  it('logs "unknown error" for a non-Error rejection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    isAxiosError.mockReturnValue(false);
    post.mockRejectedValue('weird');

    expect(await s.send()).toEqual({ sent: false });
    expect(error).toHaveBeenCalledWith(
      `${s.tag} Resend send failed:`,
      'unknown error',
    );
  });

  it('refuses to send with a misconfigured key in production, and says so', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.RESEND_API_KEY = 'placeholder';
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    expect(await s.send()).toEqual({ sent: false });
    expect(post).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(s.prodMisconfig);
    expect(info).not.toHaveBeenCalled();
  });

  it('treats a missing EMAIL_FROM as sandbox, even with a real key', async () => {
    delete process.env.EMAIL_FROM;
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    expect(await s.send()).toEqual({ sent: false });
    expect(post).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain(`${s.tag} SANDBOX MODE`);
  });
});
