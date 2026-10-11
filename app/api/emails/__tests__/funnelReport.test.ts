import { describe, expect, it } from 'vitest';

import { renderFunnelReportEmail } from '@/app/api/emails/templates/funnelReport';
import type { RegistrationFunnel } from '@/lib/types';

const WEEK: RegistrationFunnel = {
  days: 7,
  failed: false,
  totals: { visitors: 24, signups: 9, started: 6, completed: 4 },
  sources: [
    {
      ref: 'app_profile',
      label: 'App · Profile tab',
      visitors: 18,
      signups: 7,
      started: 5,
      completed: 3,
    },
    {
      ref: 'app_guest',
      label: 'App · Guest prompt',
      visitors: 6,
      signups: 2,
      started: 1,
      completed: 1,
    },
  ],
};

const EMPTY: RegistrationFunnel = {
  days: 7,
  failed: false,
  sources: [],
  totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
};

describe('renderFunnelReportEmail', () => {
  it('leads the subject with the number that matters: finished shops', () => {
    const { subject } = renderFunnelReportEmail({ funnel: WEEK });
    expect(subject).toBe(
      'iLokal app registrations, last 7 days: 4 shops finished',
    );
  });

  it('walks the four steps with each as a share of the one before', () => {
    const { html, text } = renderFunnelReportEmail({ funnel: WEEK });
    for (const body of [html, text]) {
      expect(body).toContain('Opened the link');
      expect(body).toContain('Finished');
      expect(body).toContain('38%'); // 9 of 24
      expect(body).toContain('67%'); // 6 of 9, 4 of 6
    }
  });

  it('breaks the week down by where in the app the link was tapped', () => {
    const { html, text } = renderFunnelReportEmail({ funnel: WEEK });
    expect(html).toContain('App · Profile tab');
    expect(text).toContain(
      'App · Guest prompt: 6 opened, 2 accounts, 1 started, 1 finished',
    );
  });

  it('says "1 account", not "1 accounts"', () => {
    const { text } = renderFunnelReportEmail({
      funnel: { ...WEEK, sources: [{ ...WEEK.sources[1], signups: 1 }] },
    });
    expect(text).toContain('6 opened, 1 account, 1 started');
  });

  it('links to the dashboard when the app URL is known, and omits it otherwise', () => {
    const linked = renderFunnelReportEmail({
      funnel: WEEK,
      dashboardUrl: 'https://ilokal.shop/admin',
    });
    expect(linked.html).toContain('href="https://ilokal.shop/admin"');
    expect(linked.text).toContain('https://ilokal.shop/admin');

    expect(renderFunnelReportEmail({ funnel: WEEK }).html).not.toContain(
      'href=',
    );
  });

  it('says plainly when nobody used the link, instead of a table of zeros', () => {
    const { subject, html, text } = renderFunnelReportEmail({ funnel: EMPTY });
    expect(subject).toBe('iLokal app registrations, last 7 days: no activity');
    expect(html).toContain('No one opened the app’s “List your business” link');
    expect(text).toContain('No one opened the app’s “List your business” link');
    expect(html).not.toContain('Opened the link');
  });

  it('escapes a label before it reaches the markup', () => {
    const { html } = renderFunnelReportEmail({
      funnel: {
        ...WEEK,
        sources: [{ ...WEEK.sources[0], label: '<b>x</b>' }],
      },
    });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});
