import { describe, it, expect } from 'vitest';
import { renderResetPasswordEmail } from '@/app/api/emails/templates/resetPassword';

describe('renderResetPasswordEmail', () => {
  const url =
    'http://localhost:3000/reset-password?token_hash=abc&type=recovery';

  it('returns subject, html, and text', () => {
    const email = renderResetPasswordEmail({ url });
    expect(email.subject).toBe('Reset your iLokal password');
    expect(email.html.length).toBeGreaterThan(0);
    expect(email.text.length).toBeGreaterThan(0);
  });

  it('embeds the reset url in both the CTA and the fallback link', () => {
    const { html, text } = renderResetPasswordEmail({ url });
    // In HTML the "&" is entity-encoded, so match the pre-"&" prefix; it appears
    // in the button href, the fallback anchor href, and its visible text.
    const prefix = 'reset-password?token_hash=abc';
    const occurrences = html.split(prefix).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    // The plain-text body carries the raw, unescaped url.
    expect(text).toContain(url);
  });

  it('uses a custom app name in subject and body', () => {
    const email = renderResetPasswordEmail({ url, appName: 'MyShop' });
    expect(email.subject).toBe('Reset your MyShop password');
    expect(email.html).toContain('MyShop');
  });

  it('greets by name when provided, generically otherwise', () => {
    expect(
      renderResetPasswordEmail({ url, recipientName: 'Ian' }).html,
    ).toContain('Hi Ian,');
    expect(renderResetPasswordEmail({ url }).html).toContain('Hi there,');
  });

  it('escapes HTML in dynamic values (no injection)', () => {
    const email = renderResetPasswordEmail({
      url,
      recipientName: '<script>alert(1)</script>',
    });
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('escapes ampersands in the url so query params stay valid markup', () => {
    const { html } = renderResetPasswordEmail({ url });
    // the raw "&type=" must be entity-encoded in the HTML output
    expect(html).toContain('&amp;type=recovery');
  });

  it('mentions the expiry window', () => {
    expect(renderResetPasswordEmail({ url }).text).toContain('1 hour');
    expect(
      renderResetPasswordEmail({ url, expiresInLabel: '30 minutes' }).text,
    ).toContain('30 minutes');
  });
});
