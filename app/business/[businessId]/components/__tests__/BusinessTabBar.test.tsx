/**
 * @vitest-environment happy-dom
 *
 * The tab bar's render.
 *
 * The contract sweep next door reads the source, which cannot tell whether the
 * thing actually renders four tabs, labels them from the shop's own
 * vocabulary, or marks the right one active. Driven with `react-dom/client`
 * per repo convention — `@testing-library/dom` is not installed and the stack
 * is frozen.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

let pathname = '/business/biz-1';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let openMobile = false;
const setOpenMobile = vi.fn();
vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({ openMobile, setOpenMobile }),
}));

let vocabulary = { plural: 'Products' };
vi.mock('@/providers/OfferingVocabularyProvider', () => ({
  useOfferingVocabulary: () => vocabulary,
}));

let business: { id: string } | null = { id: 'biz-1' };
vi.mock('@/providers/BusinessProvider', () => ({
  useBusinessShop: () => ({ business }),
}));

import { BusinessTabBar } from '../BusinessTabBar';

let container: HTMLDivElement;
let root: Root;

function render() {
  act(() => {
    root.render(<BusinessTabBar />);
  });
}

beforeEach(() => {
  pathname = '/business/biz-1';
  openMobile = false;
  business = { id: 'biz-1' };
  vocabulary = { plural: 'Products' };
  setOpenMobile.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('BusinessTabBar', () => {
  it('renders exactly four tabs', () => {
    render();
    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    const cells = nav!.querySelectorAll('a, button');
    expect(cells).toHaveLength(4);
  });

  it('labels every tab — never icon-only', () => {
    render();
    const labels = [...container.querySelectorAll('nav a, nav button')].map(
      (el) => el.textContent?.trim(),
    );
    expect(labels).toEqual(['Home', 'Products', 'Redeem', 'More']);
  });

  it('takes the offerings label from the shop vocabulary', () => {
    vocabulary = { plural: 'Services' };
    render();
    expect(container.textContent).toContain('Services');
    expect(container.textContent).not.toContain('Products');
  });

  it('marks only the current tab, and Home only on an exact match', () => {
    pathname = '/business/biz-1/redeemed-coupons';
    render();
    const current = [...container.querySelectorAll('[aria-current="page"]')];
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Redeem');
  });

  it('keeps a section tab active on its own sub-routes', () => {
    // The catalogue opens dialogs on child routes; the tab must not go dark.
    pathname = '/business/biz-1/product-catalogues/anything';
    render();
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain('Products');
  });

  it('does NOT mark Home active on a child route', () => {
    // Home is the only exact match — without that it would light up on every
    // page, since every path starts with the business root.
    pathname = '/business/biz-1/coupons';
    render();
    const current = [...container.querySelectorAll('[aria-current="page"]')];
    expect(current).toHaveLength(0);
  });

  it('More toggles the sheet rather than navigating', () => {
    render();
    const more = [...container.querySelectorAll('nav button')].find((b) =>
      b.textContent?.includes('More'),
    ) as HTMLButtonElement;
    expect(more.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      more.click();
    });
    expect(setOpenMobile).toHaveBeenCalledWith(true);
  });

  it('reports the sheet as expanded while it is open', () => {
    openMobile = true;
    render();
    const more = [...container.querySelectorAll('nav button')].find((b) =>
      b.textContent?.includes('More'),
    );
    expect(more?.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders nothing before a shop exists', () => {
    // The registration wizard owns that state and has its own chrome; the
    // tabs would all point at a business id that is not there yet.
    business = null;
    render();
    expect(container.querySelector('nav')).toBeNull();
  });

  it('is present in the SERVER html, not gated behind hydration', () => {
    // The whole point of deciding visibility in CSS: the server ships the bar
    // either way, so an installed app never paints a frame without it and
    // then jumps.
    const html = renderToStaticMarkup(<BusinessTabBar />);
    expect(html).toContain('Redeem');
    expect(html).toContain('More');
    // And it must not arrive pre-hidden by an inline style, which is how the
    // landing page once shipped blank.
    expect(html).not.toContain('opacity:0');
  });
});
