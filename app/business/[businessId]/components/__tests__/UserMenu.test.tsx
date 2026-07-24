// @vitest-environment happy-dom

/**
 * UserMenu (business) — logout wiring. Opens the Radix dropdown and selects
 * "Log out", asserting it routes to the BUSINESS login. react-dom/client + happy-dom.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout, isLoggingOut: false }),
}));
vi.mock('@/providers/UserContext', () => ({
  useUser: () => ({
    full_name: 'Shop Owner',
    email: 'owner@x.co',
    avatar_url: null,
  }),
}));
vi.mock('@/providers/BusinessProvider', () => ({
  useBusinessShop: () => ({ business: { id: 'biz-1' } }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { SidebarProvider } from '@/components/ui/sidebar';
import { UserMenu } from '@/app/business/[businessId]/components/UserMenu';
import { ROUTES } from '@/config/routeConfig';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
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
  return Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
    (el.textContent || '').includes('Log out'),
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

    expect(logout).toHaveBeenCalledWith(ROUTES.AUTH.BUSINESS_LOGIN);
  });
});
