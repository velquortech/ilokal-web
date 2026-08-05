// @vitest-environment happy-dom

/**
 * The public "how to register" page.
 *
 * Its whole reason to exist is that it cannot drift from the product: the steps
 * come from the wizard's own metadata, the documents line from
 * `require_business_documents`, and the after-submit copy from
 * `auto_verify_businesses`. A page that hardcodes any of the three starts lying
 * the day an admin flips a switch — which is exactly what the registration
 * success dialog had to be fixed for, and this one is indexed.
 *
 * The sections are rendered directly rather than through the page's default
 * export: that one pulls `PublicShell`, which reaches for cookies and Supabase.
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { Prerequisites, StepSpine, AfterSubmit, Hero } from '../sections';
import { getRegistrationStepMeta } from '@/app/business/registration/data/stepMeta';
import { STEP_FIELDS } from '../data';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('the step spine follows the wizard', () => {
  it('lists four steps while documents are switched off', () => {
    // The MVP shape: no permits, so no Documents step.
    const steps = getRegistrationStepMeta(false);
    const markup = html(<StepSpine steps={steps} />);

    expect(steps).toHaveLength(4);
    expect(markup).toContain('4 steps, start to finish');
    expect(markup).toContain('Business Category');
    expect(markup).toContain('Review &amp; Submit');
    expect(markup).not.toContain('Documents');
  });

  it('grows to five the moment the flag is on', () => {
    const steps = getRegistrationStepMeta(true);
    const markup = html(<StepSpine steps={steps} />);

    expect(steps).toHaveLength(5);
    expect(markup).toContain('5 steps, start to finish');
    expect(markup).toContain('Documents');
  });

  it('names the real fields for every step it renders', () => {
    // The page's job: nobody should meet the four-photo minimum for the first
    // time at step three.
    const markup = html(<StepSpine steps={getRegistrationStepMeta(false)} />);

    for (const field of STEP_FIELDS.gallery) {
      expect(markup).toContain(field);
    }
    expect(markup).toContain('Map pin');
  });

  it('numbers the sequence, because it is one', () => {
    const markup = html(<StepSpine steps={getRegistrationStepMeta(false)} />);

    expect(markup).toContain('<ol');
    expect(markup).toContain('01');
    expect(markup).toContain('04');
  });
});

describe('the documents line', () => {
  it('says there is no paperwork while the flag is off', () => {
    const markup = html(<Prerequisites requireDocuments={false} />);

    expect(markup).toContain('No permits or paperwork');
    expect(markup).not.toContain('tax certificate');
  });

  it('asks for the permits once the flag is on', () => {
    const markup = html(<Prerequisites requireDocuments />);

    expect(markup).toContain('business permit');
    expect(markup).not.toContain('No permits or paperwork');
  });
});

describe('what happens after submitting', () => {
  it('promises no review when shops are auto-verified', () => {
    // `auto_verify_businesses` is seeded true, so the shop is already published
    // by the time the success dialog paints. Promising a review here would be
    // the same lie ON18 removed, on a page search engines keep.
    const markup = html(<AfterSubmit autoVerify />);

    expect(markup).toContain('goes live right away');
    expect(markup).not.toContain('review');
  });

  it('describes the review when they are not', () => {
    const markup = html(<AfterSubmit autoVerify={false} />);

    expect(markup).toContain('Then we review it');
    expect(markup).not.toContain('goes live right away');
  });
});

describe('server HTML', () => {
  it('renders its headline and CTA without JavaScript', () => {
    // The landing shipped a blank page once by seeding state from a
    // client-only value; nothing here may be invisible or empty on the server.
    const markup = html(
      <Hero ctaHref="/signup" ctaLabel="Create an account" />,
    );

    expect(markup).toContain(
      'Put your shop where Ilonggos are already looking',
    );
    expect(markup).toContain('Create an account');
    expect(markup).not.toContain('opacity:0');
  });
});
