import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { sendMenuFollowUpEmail } from '@/app/api/emails/sendMenuFollowUp';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

const mockedPost = vi.mocked(axios.post);

const ENV = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
const base = {
  to: 'owner@example.com',
  shopName: 'Pitstop Café',
  ctaUrl: 'https://ilokal.ph/business/abc/product-catalogues',
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

afterEach(() => {
  process.env.RESEND_API_KEY = ENV.key;
  process.env.EMAIL_FROM = ENV.from;
});

describe('sendMenuFollowUpEmail — sandbox (no real key)', () => {
  it('does not call axios and reports not-sent', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await sendMenuFollowUpEmail(base);

    expect(result).toEqual({ sent: false });
    expect(mockedPost).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it('treats a placeholder (non re_) key as sandbox', async () => {
    process.env.RESEND_API_KEY = 'placeholder';
    process.env.EMAIL_FROM = 'hi@ilokal.ph';
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await sendMenuFollowUpEmail(base);

    expect(result).toEqual({ sent: false });
    expect(mockedPost).not.toHaveBeenCalled();
    info.mockRestore();
  });
});

describe('sendMenuFollowUpEmail — real send', () => {
  it('POSTs to Resend with the rendered email and reports sent', async () => {
    process.env.RESEND_API_KEY = 're_realkey';
    process.env.EMAIL_FROM = 'hi@ilokal.ph';
    mockedPost.mockResolvedValue({ data: { id: 'x' } });

    const result = await sendMenuFollowUpEmail(base);

    expect(result).toEqual({ sent: true });
    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [, body] = mockedPost.mock.calls[0]!;
    const payload = body as {
      from: string;
      to: string;
      subject: string;
      html: string;
    };
    expect(payload.to).toBe('owner@example.com');
    expect(payload.subject).toContain('menu');
    expect(payload.html).toContain('Pitstop Café');
  });

  it('never throws on a Resend failure — reports not-sent', async () => {
    process.env.RESEND_API_KEY = 're_realkey';
    process.env.EMAIL_FROM = 'hi@ilokal.ph';
    mockedPost.mockRejectedValue(new Error('boom'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await sendMenuFollowUpEmail(base);

    expect(result).toEqual({ sent: false });
    err.mockRestore();
  });
});
