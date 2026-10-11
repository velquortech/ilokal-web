import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import { sendFunnelReportEmail } from '@/app/api/emails/sendFunnelReport';
import type { RegistrationFunnel } from '@/lib/types';

vi.mock('axios', () => ({
  default: { post: vi.fn(), isAxiosError: vi.fn(() => false) },
}));

const mockedPost = vi.mocked(axios.post);
const ENV = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
const funnel: RegistrationFunnel = {
  days: 7,
  failed: false,
  sources: [],
  totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
};
const to = ['ops@example.com', 'founder@example.com'];

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

afterEach(() => {
  process.env.RESEND_API_KEY = ENV.key;
  process.env.EMAIL_FROM = ENV.from;
});

describe('sendFunnelReportEmail', () => {
  it('only logs in the sandbox (no real key) and reports not-sent', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});

    expect(await sendFunnelReportEmail({ to, funnel })).toEqual({
      sent: false,
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('sends one email to every recipient through Resend', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'iLokal <hi@ilokal.shop>';
    mockedPost.mockResolvedValue({ data: { id: 'x' } });

    expect(await sendFunnelReportEmail({ to, funnel })).toEqual({ sent: true });
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost.mock.calls[0][1]).toMatchObject({
      from: 'iLokal <hi@ilokal.shop>',
      to,
      subject: expect.stringContaining('last 7 days'),
    });
  });

  it('never throws when Resend fails', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'hi@ilokal.shop';
    mockedPost.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await sendFunnelReportEmail({ to, funnel })).toEqual({
      sent: false,
    });
  });
});
