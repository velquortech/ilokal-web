import { describe, it, expect } from 'vitest';
import { renderMenuFollowUpEmail } from '@/app/api/emails/templates/menuFollowUp';

const CTA = 'https://ilokal.ph/business/abc/product-catalogues';

describe('renderMenuFollowUpEmail', () => {
  it('returns a subject and non-empty html + text', () => {
    const email = renderMenuFollowUpEmail({
      shopName: 'The Artisan Roastery',
      ctaUrl: CTA,
    });
    expect(email.subject).toBe('Add your menu on iLokal');
    expect(email.html.length).toBeGreaterThan(0);
    expect(email.text.length).toBeGreaterThan(0);
  });

  it('puts the CTA link in both the html and the text', () => {
    const { html, text } = renderMenuFollowUpEmail({
      shopName: 'Cafe',
      ctaUrl: CTA,
    });
    // Once in the button, once in the copy-paste fallback.
    const occurrences = html.split(CTA).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    expect(text).toContain(CTA);
  });

  it('names the shop, greeting the owner when given', () => {
    expect(
      renderMenuFollowUpEmail({
        shopName: 'Cafe',
        ctaUrl: CTA,
        recipientName: 'Ian',
      }).html,
    ).toContain('Hi Ian,');
    expect(
      renderMenuFollowUpEmail({ shopName: 'Cafe', ctaUrl: CTA }).html,
    ).toContain('Hi there,');
  });

  it('flows the vertical noun into the subject, heading and CTA', () => {
    const { subject, html } = renderMenuFollowUpEmail({
      shopName: 'Nena Salon',
      ctaUrl: CTA,
      offeringNoun: 'service menu',
      offeringPlural: 'services',
    });
    expect(subject).toBe('Add your service menu on iLokal');
    // Title-cased in the heading and button.
    expect(html).toContain('Service Menu');
    expect(html).toContain('services');
  });

  it('falls back to menu / listings when no noun is given', () => {
    const { subject, text } = renderMenuFollowUpEmail({
      shopName: 'Shop',
      ctaUrl: CTA,
    });
    expect(subject).toContain('menu');
    expect(text).toContain('listings');
  });

  it('escapes an html-bearing shop name — no raw markup reaches the body', () => {
    const email = renderMenuFollowUpEmail({
      shopName: '<script>alert(1)</script>',
      ctaUrl: CTA,
    });
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('escapes ampersands in the CTA url', () => {
    const { html } = renderMenuFollowUpEmail({
      shopName: 'Shop',
      ctaUrl: 'https://x.test/c?a=1&b=2',
    });
    expect(html).toContain('a=1&amp;b=2');
  });
});
