// @vitest-environment happy-dom

/**
 * LandingFooter — route links must soft-navigate.
 *
 * The footer used to render every entry as a plain `<a>`, which was harmless
 * while they were all in-page hashes. Now that Shops/Deals point at real
 * routes, an `<a>` would force a full document reload on the way into
 * /explore — invisible in a screenshot, obvious in the Network tab. The
 * `next/link` mock tags what it renders so the split is assertable.
 *
 * `react-dom/client` + happy-dom, no @testing-library (peer not installed,
 * stack frozen).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ROUTES } from '@/config/routeConfig';
import { footerColumns } from '../data';
import { LandingFooter } from '../LandingFooter';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) =>
    React.createElement(
      'a',
      { href, 'data-soft-nav': 'true', ...rest },
      children,
    ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<LandingFooter />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function anchor(href: string) {
  return container.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);
}

describe('footerColumns', () => {
  it('sends Shops and Deals to the real explore surfaces', () => {
    const product = footerColumns.find((c) => c.title === 'Product')!;
    expect(product.links.find((l) => l.label === 'Shops')?.href).toBe(
      ROUTES.EXPLORE.HOME,
    );
    expect(product.links.find((l) => l.label === 'Deals')?.href).toBe(
      ROUTES.EXPLORE.DEALS,
    );
  });
});

describe('LandingFooter link rendering', () => {
  it('renders route links through next/link (soft navigation)', () => {
    expect(anchor(ROUTES.EXPLORE.HOME)?.dataset.softNav).toBe('true');
    expect(anchor(ROUTES.EXPLORE.DEALS)?.dataset.softNav).toBe('true');
  });

  it('leaves in-page hash anchors as plain <a>', () => {
    // A hash through next/link is pointless churn — and #-only placeholders
    // would throw in the App Router.
    expect(anchor('#businesses')?.dataset.softNav).toBeUndefined();
    expect(anchor('#about')?.dataset.softNav).toBeUndefined();
  });

  it('routes every non-hash href through next/link, without exception', () => {
    const missed = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a'),
    ).filter(
      (a) =>
        !a.getAttribute('href')?.startsWith('#') &&
        a.dataset.softNav !== 'true',
    );
    expect(missed.map((a) => a.getAttribute('href'))).toEqual([]);
  });
});
