// @vitest-environment happy-dom

/**
 * CustomerFooter — the explore surface's second route back to the landing.
 *
 * The interesting invariant is P10: any link into a landing section must be
 * absolute (`/home#about`). A bare `#about` renders fine and silently scrolls
 * nowhere from /explore, so only a test catches the regression.
 *
 * `react-dom/client` + happy-dom, no @testing-library (peer not installed,
 * stack frozen). Precedent: `components/custom/__tests__/GlobalSearch.test.tsx`.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ROUTES, landingSectionPath } from '@/config/routeConfig';
import { CustomerFooter } from '@/components/customer/CustomerFooter';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement('a', { href, ...rest }, children),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<CustomerFooter />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function hrefs() {
  return Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).map(
    (a) => a.getAttribute('href'),
  );
}

describe('CustomerFooter', () => {
  it('links back to the landing (nav entry + brand lockup)', () => {
    expect(hrefs().filter((h) => h === ROUTES.PUBLIC.LANDING).length).toBe(2);
  });

  it('covers the whole explore surface', () => {
    const all = hrefs();
    expect(all).toContain(ROUTES.EXPLORE.HOME);
    expect(all).toContain(ROUTES.EXPLORE.NEARBY);
    expect(all).toContain(ROUTES.EXPLORE.DEALS);
  });

  it('carries the business-registration CTA', () => {
    expect(hrefs()).toContain(ROUTES.BUSINESS.registration);
  });

  it('makes landing-section anchors absolute, never bare hashes', () => {
    expect(hrefs()).toContain(landingSectionPath('about'));
    expect(hrefs().some((h) => h?.startsWith('#'))).toBe(false);
  });

  it('exposes a labelled footer nav landmark', () => {
    const nav = container.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Footer');
  });
});
