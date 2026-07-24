// @vitest-environment happy-dom

/**
 * AdminUserMenu — logout wiring. Opens the Radix dropdown and selects "Log out",
 * asserting it routes to the ADMIN login. react-dom/client + happy-dom.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { logout, authState } = vi.hoisted(() => ({
  logout: vi.fn(),
  authState: { isLoggingOut: false },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout, isLoggingOut: authState.isLoggingOut }),
}));
vi.mock('@/providers/UserContext', () => ({
  useUser: () => ({
    full_name: 'Admin User',
    email: 'admin@x.co',
    avatar_url: null,
  }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminUserMenu } from '@/app/admin/[adminId]/components/AdminUserMenu';
import { ROUTES } from '@/config/routeConfig';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  authState.isLoggingOut = false;
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
        <AdminUserMenu />
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
  const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (el) => /Log out|Signing out/.test(el.textContent || ''),
  );
  return item as HTMLElement | undefined;
}

describe('AdminUserMenu logout', () => {
  it('logs out to the admin login', async () => {
    const item = await openAndLogout();
    expect(item).toBeDefined();

    await act(async () => {
      item!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      item!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(logout).toHaveBeenCalledWith(ROUTES.AUTH.ADMIN_LOGIN);
  });

  it('shows the busy state and disables the item while signing out', async () => {
    authState.isLoggingOut = true;
    const item = await openAndLogout();

    expect(item).toBeDefined();
    expect(item!.textContent).toContain('Signing out');
    expect(item!.getAttribute('aria-disabled')).toBe('true');
  });
});
