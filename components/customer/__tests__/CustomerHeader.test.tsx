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
import { ROUTES, landingSectionPath } from '@/config/routeConfig';
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
  it('renders the Home link for a signed-in customer', () => {
    render(CUSTOMER);
    expect(
      anchors(ROUTES.PUBLIC.LANDING).some((a) =>
        a.textContent?.includes('Home'),
      ),
    ).toBe(true);
  });

  it('exposes Home in both the inline and the scroll nav row', () => {
    render(CUSTOMER);
    // Both rows render from the same array — two Home anchors, so a
    // small-screen visitor is never stranded on /explore.
    const home = anchors(ROUTES.PUBLIC.LANDING).filter((a) =>
      a.textContent?.includes('Home'),
    );
    expect(home.length).toBe(2);
  });

  it('keeps the explore entries alongside Home', () => {
    render(CUSTOMER);
    expect(anchors(ROUTES.EXPLORE.NEARBY).length).toBeGreaterThan(0);
    expect(anchors(ROUTES.EXPLORE.DEALS).length).toBeGreaterThan(0);
  });
});

describe('CustomerHeader — session decides which chrome renders', () => {
  /** Labels of the inline nav row. */
  function navLabels() {
    const inline = container.querySelector('nav')!;
    return Array.from(inline.querySelectorAll('a')).map((a) =>
      a.textContent?.trim(),
    );
  }

  it('hands an anonymous visitor the landing nav, not the app header', () => {
    render(null);
    // Delegated to PublicNav, which mounts the real LandingNav inside the
    // landing token wrapper — so /explore and / are one design, not two.
    expect(container.querySelector('[data-ilokal-root]')).not.toBeNull();
    // Exactly the landing's own list, in the landing's own order — the two
    // surfaces are one design, so the menu must not change between them.
    expect(navLabels()).toEqual([
      'Explore Shops',
      'Near You',
      'Deals',
      'Voices',
      'For Businesses',
    ]);
  });

  it('swaps to the app header once there is a session', () => {
    render(CUSTOMER);
    expect(container.querySelector('[data-ilokal-root]')).toBeNull();
    expect(navLabels()).toEqual(['Home', 'Explore', 'Nearby', 'Deals']);
  });

  it('gives an owner the app header too, not the marketing nav', () => {
    // A signed-in owner on /explore, and every /customer page, must never get
    // "For Businesses" — that is a pitch to someone without an account.
    render(OWNER);
    expect(navLabels()).toEqual(['Home', 'Explore', 'Nearby', 'Deals']);
  });

  it('points the anon nav at absolute landing anchors, never bare hashes', () => {
    render(null);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain(landingSectionPath('near-you'));
    expect(hrefs).toContain(landingSectionPath('businesses'));
    expect(hrefs).toContain(landingSectionPath('voices'));
    // The landing's own nav uses `#shoppers` etc, which scroll nowhere here.
    expect(hrefs.some((h) => h?.startsWith('#'))).toBe(false);
  });

  it('keeps all three anon doors: sign-in, sign-up, list your business', () => {
    render(null);
    expect(anchors(ROUTES.AUTH.SIGN_IN).length).toBeGreaterThan(0);
    expect(anchors(ROUTES.AUTH.SIGNUP).length).toBeGreaterThan(0);
    expect(anchors(ROUTES.BUSINESS.registration).length).toBeGreaterThan(0);
  });

  it('sends anon "Deals" to the real feed, not the landing teaser', () => {
    render(null);
    const deals = Array.from(container.querySelectorAll('nav a')).filter(
      (a) => a.textContent?.trim() === 'Deals',
    );
    expect(deals.length).toBeGreaterThan(0);
    expect(
      deals.every((a) => a.getAttribute('href') === ROUTES.EXPLORE.DEALS),
    ).toBe(true);
  });
});

describe('CustomerHeader — brand lockup destination', () => {
  it('sends an anonymous visitor to the landing', () => {
    render(null);
    // The landing nav's lockup carries no aria-label of its own — it is the
    // first anchor in the header.
    const brand = container.querySelector<HTMLAnchorElement>('header a');
    expect(brand?.getAttribute('href')).toBe(ROUTES.PUBLIC.LANDING);
  });

  it('sends a signed-in customer to their shop feed', () => {
    render(CUSTOMER);
    const brand = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="iLokal — explore shops"]',
    );
    expect(brand?.getAttribute('href')).toBe(ROUTES.EXPLORE.HOME);
  });

  it('is a flex box, so no line-height strut offsets it from the nav row', () => {
    render(CUSTOMER);
    const brand = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="iLokal — explore shops"]',
    )!;
    // An inline anchor's flex-item box is a line box: the strut pads the
    // lockup and items-center then centres the padding, not the logo.
    // (The landing nav solves the same problem with inline `display:inline-flex`.)
    expect(brand.className).toContain('flex');
    expect(brand.className).toContain('items-center');
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
    // Sign-up appears twice: the action row and the mobile overlay CTA.
    expect(anchors(ROUTES.AUTH.SIGNUP).length).toBeGreaterThan(0);
    const listBusiness = anchors(ROUTES.BUSINESS.registration);
    expect(listBusiness.length).toBe(1);
    expect(listBusiness[0]!.textContent).toContain('List Your Business');
  });

  it('collapses the whole row rather than hiding CTAs one by one', () => {
    render(null);
    // The landing nav drops .navlinks/.navactions and shows .hamb below
    // 1100px (landing.css), so no per-button breakpoint class is needed.
    expect(container.querySelector('.navactions')).not.toBeNull();
    expect(container.querySelector('.hamb')).not.toBeNull();
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
      // Anonymous gets the landing nav's toggle (aria-label only, no text);
      // signed-in gets the shadcn ThemeToggle (sr-only text). Both must exist,
      // and both drive next-themes.
      const toggle =
        container.querySelector('[aria-label="Toggle theme"]') ??
        Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Toggle theme'),
        );
      expect(toggle).toBeTruthy();
    }
  });
});

describe('CustomerHeader — active state', () => {
  it('marks the current explore route, not Home', () => {
    pathname.value = ROUTES.EXPLORE.NEARBY;
    // Nearby only exists in the app set, so this needs a session.
    render(CUSTOMER);

    // `<Button asChild>` is a Radix Slot — the highlight classes land on the
    // anchor itself, not on a wrapper.
    // classList, not a substring match: every ghost Button carries
    // `hover:bg-accent`, which `toContain('bg-accent')` would happily match.
    const nearby = anchors(ROUTES.EXPLORE.NEARBY)[0]!;
    const home = anchors(ROUTES.PUBLIC.LANDING)[0]!;
    expect(nearby.classList.contains('bg-accent')).toBe(true);
    expect(home.classList.contains('bg-accent')).toBe(false);
  });
});
