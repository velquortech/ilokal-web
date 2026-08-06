// @vitest-environment happy-dom

/**
 * UserMenu (business) — logout wiring. Opens the Radix dropdown and selects
 * "Log out", asserting it routes to the BUSINESS login. react-dom/client + happy-dom.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { logout, authState, userState, shopState } = vi.hoisted(() => ({
  logout: vi.fn(),
  authState: { isLoggingOut: false },
  userState: {
    value: {
      full_name: 'Shop Owner',
      email: 'owner@x.co',
      avatar_url: null as string | null,
    },
  },
  shopState: {
    value: {
      id: 'biz-1',
      shop_name: null as string | null,
      logo_url: null as string | null,
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout, isLoggingOut: authState.isLoggingOut }),
}));
vi.mock('@/providers/UserContext', () => ({
  useUser: () => userState.value,
}));
vi.mock('@/providers/BusinessProvider', () => ({
  useBusinessShop: () => ({ business: shopState.value }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { SidebarProvider } from '@/components/ui/sidebar';
import { OnboardingTourProvider } from '@/components/custom/onboarding/OnboardingTourProvider';
import {
  UserMenu,
  resolveAccountAvatar,
} from '@/app/business/[businessId]/components/UserMenu';
import { ROUTES } from '@/config/routeConfig';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  authState.isLoggingOut = false;
  userState.value = {
    full_name: 'Shop Owner',
    email: 'owner@x.co',
    avatar_url: null,
  };
  shopState.value = { id: 'biz-1', shop_name: null, logo_url: null };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function openAndLogout() {
  act(() =>
    root.render(
      <SidebarProvider>
        <UserMenu />
      </SidebarProvider>,
    ),
  );
  const trigger = container.querySelector('button')!;
  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  // The label swaps to "Signing out…" in the busy state, so match either.
  return Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
    /Log out|Signing out/.test(el.textContent || ''),
  ) as HTMLElement | undefined;
}

describe('UserMenu (business) logout', () => {
  it('logs out to the business login', async () => {
    const item = await openAndLogout();
    expect(item).toBeDefined();

    await act(async () => {
      item!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      item!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(logout).toHaveBeenCalledWith(ROUTES.AUTH.SIGN_IN);
  });

  it('shows the busy state and disables the item while signing out', async () => {
    authState.isLoggingOut = true;
    const item = await openAndLogout();

    expect(item).toBeDefined();
    expect(item!.textContent).toContain('Signing out');
    expect(item!.getAttribute('aria-disabled')).toBe('true');
  });
});

async function openMenuWithTour(enabled: boolean) {
  act(() =>
    root.render(
      <SidebarProvider>
        <OnboardingTourProvider businessId="biz-1" enabled={enabled}>
          <UserMenu />
        </OnboardingTourProvider>
      </SidebarProvider>,
    ),
  );
  const trigger = container.querySelector('button')!;
  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  return Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
    /Replay tour/.test(el.textContent || ''),
  );
}

describe('UserMenu (business) tour replay', () => {
  it('offers a replay when the tour is switched on', async () => {
    // Replay is the only way back in after one stray "Not now" — without it a
    // single click ends onboarding permanently.
    expect(await openMenuWithTour(true)).toBeDefined();
  });

  it('advertises nothing when the tour is switched off', async () => {
    // Absent, not disabled: a menu entry that opens nothing is worse than one
    // that is not there.
    expect(await openMenuWithTour(false)).toBeUndefined();
  });
});

async function openMenu() {
  act(() =>
    root.render(
      <SidebarProvider>
        <UserMenu />
      </SidebarProvider>,
    ),
  );
  const trigger = container.querySelector('button')!;
  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  return Array.from(document.querySelectorAll('[role="menuitem"]')).map(
    (el) => el.textContent ?? '',
  );
}

describe('UserMenu (business) entries that go nowhere', () => {
  /**
   * Neither `subscription/` nor `help/` exists under
   * `app/business/[businessId]/`, so both entries were links to a 404 sitting
   * in the account menu.
   */
  it('does not offer Subscription or Help & Support', async () => {
    const labels = await openMenu();

    expect(labels.some((l) => /Subscription/.test(l))).toBe(false);
    expect(labels.some((l) => /Help/.test(l))).toBe(false);
    // The entries that DO have pages are untouched.
    expect(labels.some((l) => /Profile/.test(l))).toBe(true);
    expect(labels.some((l) => /Settings/.test(l))).toBe(true);
  });

  it('leaves no doubled separator where they used to be', async () => {
    // With the tour off and Help & Support gone, that group is empty — two
    // separators in a row read as an item that failed to render.
    await openMenu();

    const items = Array.from(
      document.querySelectorAll('[role="menuitem"],[role="separator"]'),
    );
    const doubled = items.some(
      (el, i) =>
        el.getAttribute('role') === 'separator' &&
        items[i + 1]?.getAttribute('role') === 'separator',
    );
    expect(doubled).toBe(false);
  });
});

describe('UserMenu (business) avatar', () => {
  /**
   * The fallback was the literal `"CN"` — shadcn's placeholder, two letters
   * belonging to nobody, on the one control that says who is signed in.
   */
  it('never renders the placeholder initials', async () => {
    await openMenu();
    expect(document.body.textContent).not.toContain('CN');
  });

  it("falls back to the SHOP's initials, not the owner's", async () => {
    shopState.value = {
      id: 'biz-1',
      shop_name: 'Seed Coffee Roasters',
      logo_url: null,
    };
    await openMenu();

    // Radix only mounts the fallback once the image fails, so assert on the
    // trigger's own fallback, which is rendered eagerly in happy-dom (no image
    // loading at all).
    expect(document.body.textContent).toContain('SR');
  });
});

/**
 * Asserted on the pure resolver rather than the DOM: Radix mounts
 * `<AvatarImage>` only once the image has LOADED, and nothing loads under
 * happy-dom — so a `container.querySelector('img')` assertion would pass
 * whether the logic is right or not.
 */
describe('resolveAccountAvatar', () => {
  const SHOP = { shop_name: 'Seed Coffee Roasters', logo_url: null };
  const OWNER = { full_name: 'Shop Owner', avatar_url: null };

  it('prefers the shop logo and labels it as the shop', () => {
    expect(
      resolveAccountAvatar(
        { ...SHOP, logo_url: 'https://cdn.example/logo.webp' },
        { ...OWNER, avatar_url: 'https://cdn.example/me.webp' },
      ),
    ).toMatchObject({
      src: 'https://cdn.example/logo.webp',
      // `alt` follows the same choice as `src`, so the picture can never be
      // labelled as the other thing.
      alt: 'Seed Coffee Roasters',
    });
  });

  it("falls back to the owner's avatar, labelled as the owner", () => {
    expect(
      resolveAccountAvatar(SHOP, {
        ...OWNER,
        avatar_url: 'https://cdn.example/me.webp',
      }),
    ).toMatchObject({
      src: 'https://cdn.example/me.webp',
      alt: 'Shop Owner',
    });
  });

  it("uses the SHOP's initials, not the owner's, when there is no picture", () => {
    expect(resolveAccountAvatar(SHOP, OWNER)).toMatchObject({
      src: undefined,
      initials: 'SR',
    });
  });

  it("falls through to the owner's initials with no shop name", () => {
    expect(
      resolveAccountAvatar({ shop_name: null, logo_url: null }, OWNER),
    ).toMatchObject({ initials: 'SO' });
  });

  it('never produces the shadcn placeholder', () => {
    // "CN" is two letters belonging to nobody, on the control that says who is
    // signed in.
    for (const result of [
      resolveAccountAvatar(null, null),
      resolveAccountAvatar(undefined, undefined),
      resolveAccountAvatar({ shop_name: '   ', logo_url: null }, null),
    ]) {
      expect(result.initials).not.toBe('CN');
      expect(result.alt).toBeTruthy();
    }
  });
});
