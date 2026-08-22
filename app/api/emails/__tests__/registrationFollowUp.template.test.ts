import { describe, it, expect } from 'vitest';
import { renderRegistrationFollowUpEmail } from '@/app/api/emails/templates/registrationFollowUp';
import { escapeHtml } from '@/app/api/emails/templates/shell';

const BASE = { ctaUrl: 'https://ilokal.ph/business/registration' };

describe('renderRegistrationFollowUpEmail', () => {
  it('returns subject, html and text', () => {
    const email = renderRegistrationFollowUpEmail(BASE);
    expect(email.subject).toBeTruthy();
    expect(email.html).toContain('<!DOCTYPE html>');
    expect(email.text).toContain('ilokal.ph/business/registration');
  });

  it('renders the CTA url in the button and the copy-paste fallback', () => {
    const email = renderRegistrationFollowUpEmail(BASE);
    // Button href + mso roundrect + the "button not working" box.
    const occurrences = email.html.split(BASE.ctaUrl).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('greets by name when given one, and neutrally otherwise', () => {
    expect(
      renderRegistrationFollowUpEmail({ ...BASE, recipientName: 'Ana' }).html,
    ).toContain('Hi Ana');
    expect(renderRegistrationFollowUpEmail(BASE).html).toContain('Hi there');
  });

  describe('progress claims', () => {
    it('names the step when a real one was recorded', () => {
      const email = renderRegistrationFollowUpEmail({
        ...BASE,
        furthestStep: 4,
        totalSteps: 6,
      });
      expect(email.subject).toContain('2 steps');
      expect(email.html).toContain('step 4 of 6');
      expect(email.html).toContain('Pick up where you left off');
    });

    it('uses the singular when exactly one step remains', () => {
      const email = renderRegistrationFollowUpEmail({
        ...BASE,
        furthestStep: 5,
        totalSteps: 6,
      });
      expect(email.subject).toContain('1 step from');
      expect(email.subject).not.toContain('1 steps');
    });

    it('claims NO progress when the step is unknown', () => {
      // NULL means the funnel never saw them (it only began recording on
      // 2026-08-15) — not that they reached step 0. Inventing progress here
      // would be a false statement to a real person.
      const email = renderRegistrationFollowUpEmail(BASE);
      expect(email.html).not.toContain('step');
      expect(email.html).toContain('Your shop is not listed yet');
      expect(email.subject).toBe('Finish listing your shop on iLokal');
    });

    it('ignores an out-of-range step rather than rendering "step 9 of 6"', () => {
      for (const bad of [0, -1, 9, Number.NaN]) {
        const email = renderRegistrationFollowUpEmail({
          ...BASE,
          furthestStep: bad,
          totalSteps: 6,
        });
        expect(email.html).not.toContain('of 6');
      }
    });
  });

  it('escapes an interpolated name so it cannot inject markup', () => {
    const email = renderRegistrationFollowUpEmail({
      ...BASE,
      recipientName: '<script>alert(1)</script>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('escapes the app name everywhere it appears', () => {
    const email = renderRegistrationFollowUpEmail({
      ...BASE,
      appName: 'Tom & Jerry',
    });
    expect(email.html).toContain('Tom &amp; Jerry');
    expect(email.html).not.toMatch(/Tom & Jerry/);
  });
});

describe('escapeHtml (shared shell)', () => {
  it('escapes every character that could break out of markup', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('escapes the ampersand FIRST, so entities are not double-encoded', () => {
    // Wrong order yields `&amp;lt;`, which renders literally as "&lt;".
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});
