import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { sendResetEmail } from '@/app/api/emails/sendResetEmail';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

const mockedPost = vi.mocked(axios.post);

const ENV = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
const url = 'http://localhost:3000/reset-password?token_hash=abc&type=recovery';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

afterEach(() => {
  process.env.RESEND_API_KEY = ENV.key;
  process.env.EMAIL_FROM = ENV.from;
});

describe('sendResetEmail — no API key (local sandbox)', () => {
  it('does not call axios and logs the link', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await sendResetEmail({ to: 'user@example.com', url });

    expect(result).toEqual({ sent: false });
    expect(mockedPost).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining(url));
    info.mockRestore();
  });

  it('logs when only EMAIL_FROM is missing', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await sendResetEmail({ to: 'user@example.com', url });

    expect(result).toEqual({ sent: false });
    expect(mockedPost).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it('treats a placeholder key (no "re_" prefix) as sandbox and does not send', async () => {
    process.env.RESEND_API_KEY = 'your_resend_api_key';
    process.env.EMAIL_FROM = 'no-reply@example.com';
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    const result = await sendResetEmail({ to: 'user@example.com', url });

    expect(result).toEqual({ sent: false });
    expect(mockedPost).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining(url));
    info.mockRestore();
  });
});

describe('sendResetEmail — key present (Resend)', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'no-reply@ilokal.test';
  });

  it('posts the rendered email to Resend with the auth header', async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: 'email_1' } });
    const result = await sendResetEmail({ to: 'user@example.com', url });

    expect(result).toEqual({ sent: true });
    expect(mockedPost).toHaveBeenCalledTimes(1);

    const [endpoint, payload, config] = mockedPost.mock.calls[0];
    expect(endpoint).toBe('https://api.resend.com/emails');
    expect(payload).toMatchObject({
      from: 'no-reply@ilokal.test',
      to: 'user@example.com',
      subject: 'Reset your iLokal password',
    });
    // html entity-encodes the "&"; the plain-text part carries the raw url.
    expect((payload as { text: string }).text).toContain(url);
    expect((payload as { html: string }).html).toContain('token_hash=abc');
    expect(
      (config as { headers: Record<string, string> }).headers.Authorization,
    ).toBe('Bearer re_test_key');
  });

  it('swallows a send failure and reports sent:false', async () => {
    mockedPost.mockRejectedValueOnce(new Error('network down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendResetEmail({ to: 'user@example.com', url });

    expect(result).toEqual({ sent: false });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
