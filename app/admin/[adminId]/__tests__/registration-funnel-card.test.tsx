// @vitest-environment happy-dom

/**
 * The dashboard's app-registration funnel card.
 *
 * Same rule as the growth chart beside it: a read that broke, a month with no
 * traffic, and real numbers must never look alike to someone deciding things
 * from this screen.
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RegistrationFunnel } from '@/lib/types';
import { RegistrationFunnelCard } from '../components/RegistrationFunnelCard';

const html = (funnel: RegistrationFunnel) =>
  renderToStaticMarkup(<RegistrationFunnelCard funnel={funnel} />);

const POPULATED: RegistrationFunnel = {
  days: 30,
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

describe('RegistrationFunnelCard', () => {
  it('walks the four steps with each step as a share of the one before', () => {
    const markup = html(POPULATED);

    expect(markup).toContain('Opened the link');
    expect(markup).toContain('Created an account');
    expect(markup).toContain('Started registering');
    expect(markup).toContain('Finished');
    // 9 of 24, 6 of 9, 4 of 6.
    expect(markup).toContain('38%');
    expect(markup).toContain('67%');
    expect(markup).toContain('last 30 days');
  });

  it('breaks the numbers down by where in the app the link was tapped', () => {
    const markup = html(POPULATED);

    expect(markup).toContain('App · Profile tab');
    expect(markup).toContain('App · Guest prompt');
  });

  it('says the read failed instead of showing a funnel of zeros', () => {
    const markup = html({
      days: 30,
      failed: true,
      sources: [],
      totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
    });

    expect(markup).toContain('couldn’t load');
    expect(markup).not.toContain('Opened the link');
  });

  it('says nobody has used the link yet when the read succeeded empty', () => {
    const markup = html({
      days: 30,
      failed: false,
      sources: [],
      totals: { visitors: 0, signups: 0, started: 0, completed: 0 },
    });

    expect(markup).toContain('No one has opened');
    expect(markup).not.toContain('couldn’t load');
    expect(markup).not.toContain('Opened the link');
  });

  it('shows no percentage for a step after an empty one', () => {
    const markup = html({
      days: 30,
      failed: false,
      totals: { visitors: 5, signups: 0, started: 0, completed: 0 },
      sources: [
        {
          ref: 'app_profile',
          label: 'App · Profile tab',
          visitors: 5,
          signups: 0,
          started: 0,
          completed: 0,
        },
      ],
    });

    expect(markup).toContain('0%'); // 0 of 5 signed up
    expect(markup).not.toContain('NaN');
  });
});
