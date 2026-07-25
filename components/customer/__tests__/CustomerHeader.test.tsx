// @vitest-environment happy-dom

/**
 * CustomerHeader — public-navigation contract.
 *
 * The landing links into /explore; without a Home entry here the only route
 * back out of the explore surface is the browser Back button. These are the
 * regression nets for that link and for the brand-lockup destination.
 *
 * Driven with `react-dom/client` + happy-dom (both already present) instead of
 * @testing-library — its peer `@testing-library/dom` isn't installed and the
 * stack is frozen. Precedent: `components/custom/__tests__/GlobalSearch.test.tsx`.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ROUTES } from '@/config/routeConfig';
import {
  CustomerHeader,
  type CustomerHeaderUser,
} from '@/components/customer/CustomerHeader';

// Hoisted above the imports, so it can't reference ROUTES — reset per test.
const pathname = vi.hoisted(() => ({ value: '/explore' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}));

// next/link drags the App Router runtime into a bare react-dom render; the
// component only cares that it produces an anchor with the right href.
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

// useAuth calls a Server Action on logout — irrelevant to navigation markup.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn(), isLoggingOut: false }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pathname.value = ROUTES.EXPLORE.HOME;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const CUSTOMER: CustomerHeaderUser = {
  id: 'user-1',
  full_name: 'Kara C',
  avatar_url: null,
  role: 'app_user',
};

const OWNER: CustomerHeaderUser = {
  id: 'user-2',
  full_name: 'Owner O',
  avatar_url: null,
  role: 'business_owner',
};

function render(user: CustomerHeaderUser | null) {
  act(() => {
    root.render(<CustomerHeader user={user} />);
  });
}

/** Every anchor pointing at `href`, across the desktop and mobile nav rows. */
function anchors(href: string) {
  return Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).filter(
    (a) => a.getAttribute('href') === href,
  );
}

describe('CustomerHeader — route back to the landing', () => {
  it('renders a Home link to the landing for an anonymous visitor', () => {
    render(null);
    const home = anchors(ROUTES.PUBLIC.LANDING);
    expect(home.length).toBeGreaterThan(0);
    expect(home.some((a) => a.textContent?.includes('Home'))).toBe(true);
  });

  it('renders the Home link for a signed-in customer too', () => {
    render(CUSTOMER);
    expect(
      anchors(ROUTES.PUBLIC.LANDING).some((a) =>
        a.textContent?.includes('Home'),
      ),
    ).toBe(true);
  });

  it('exposes Home in both the desktop and the mobile nav row', () => {
    render(null);
    // Both rows render from the same NAV_LINKS array — two Home anchors, so a
    // small-screen visitor is never stranded on /explore.
    const home = anchors(ROUTES.PUBLIC.LANDING).filter((a) =>
      a.textContent?.includes('Home'),
    );
    expect(home.length).toBe(2);
  });

  it('keeps the existing explore entries alongside Home', () => {
    render(null);
    expect(anchors(ROUTES.EXPLORE.NEARBY).length).toBeGreaterThan(0);
    expect(anchors(ROUTES.EXPLORE.DEALS).length).toBeGreaterThan(0);
  });
});

describe('CustomerHeader — brand lockup destination', () => {
  it('sends an anonymous visitor to the landing', () => {
    render(null);
    const brand = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="iLokal — home"]',
    );
    expect(brand?.getAttribute('href')).toBe(ROUTES.PUBLIC.LANDING);
  });

  it('sends a signed-in customer to their shop feed', () => {
    render(CUSTOMER);
    const brand = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="iLokal — explore shops"]',
    );
    expect(brand?.getAttribute('href')).toBe(ROUTES.EXPLORE.HOME);
  });

  it('sends a business owner browsing publicly to the landing', () => {
    render(OWNER);
    const brand = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="iLokal — home"]',
    );
    expect(brand?.getAttribute('href')).toBe(ROUTES.PUBLIC.LANDING);
  });
});

describe('CustomerHeader — anonymous conversion CTAs', () => {
  it('offers sign-in, sign-up and the business-registration CTA', () => {
    render(null);
    expect(anchors(ROUTES.AUTH.SIGN_IN).length).toBe(1);
    expect(anchors(ROUTES.AUTH.SIGNUP).length).toBe(1);
    // Parity with the landing's primary CTA.
    const listBusiness = anchors(ROUTES.BUSINESS.registration);
    expect(listBusiness.length).toBe(1);
    expect(listBusiness[0]!.textContent).toContain('List Your Business');
  });

  it('hides the registration CTA below the sm breakpoint', () => {
    render(null);
    expect(anchors(ROUTES.BUSINESS.registration)[0]!.className).toContain(
      'sm:inline-flex',
    );
  });

  it('drops all three once a customer is signed in', () => {
    render(CUSTOMER);
    expect(anchors(ROUTES.AUTH.SIGN_IN).length).toBe(0);
    expect(anchors(ROUTES.AUTH.SIGNUP).length).toBe(0);
    expect(anchors(ROUTES.BUSINESS.registration).length).toBe(0);
    // …and keeps the customer's own surfaces.
    expect(anchors(ROUTES.CUSTOMER.WALLET).length).toBeGreaterThan(0);
    expect(
      container.querySelector('[aria-label="Account menu"]'),
    ).not.toBeNull();
  });
});

describe('CustomerHeader — theme control', () => {
  it('renders a theme toggle for every visitor', () => {
    for (const user of [null, CUSTOMER, OWNER]) {
      render(user);
      const toggle = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Toggle theme'),
      );
      expect(toggle).toBeDefined();
    }
  });
});

describe('CustomerHeader — active state', () => {
  it('marks the current explore route, not Home', () => {
    pathname.value = ROUTES.EXPLORE.NEARBY;
    render(null);

    // `<Button asChild>` is a Radix Slot — the highlight classes land on the
    // anchor itself, not on a wrapper.
    const nearby = anchors(ROUTES.EXPLORE.NEARBY)[0]!;
    const home = anchors(ROUTES.PUBLIC.LANDING)[0]!;
    expect(nearby.className).toContain('bg-accent');
    expect(home.className).not.toContain('bg-accent');
  });
});
