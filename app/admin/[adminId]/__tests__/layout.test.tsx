/**
 * Admin [adminId] layout integration test
 * Guards the dynamic segment: delegates auth to getAdminUserOrRedirect and
 * redirects to the caller's own admin space when the URL segment doesn't match.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@/lib/types/user';

const redirect = vi.fn();
const getAdminUserOrRedirect = vi.fn();

/** The `sidebar_state` cookie the layout seeds `defaultOpen` from. */
let sidebarCookie: string | undefined;

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'sidebar_state' && sidebarCookie !== undefined
          ? { name, value: sidebarCookie }
          : undefined,
    }),
}));

vi.mock('@/lib/api/appSettings', () => ({
  getEventsEnabled: () => Promise.resolve(false),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}));

vi.mock('@/lib/api/getCurrentUser', () => ({
  getAdminUserOrRedirect: () => getAdminUserOrRedirect(),
}));

// Keep the heavy client shell out of the unit env — we assert the guard logic
// and the props the shell is handed, not its render.
const adminLayoutProps = vi.fn();
vi.mock('../components/AdminLayout', () => ({
  default: (props: Record<string, unknown>) => {
    adminLayoutProps(props);
    return null;
  },
}));

vi.mock('@/providers/AdminProvider', () => ({
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { renderToStaticMarkup } from 'react-dom/server';
import AdminIdLayout from '../layout';

const adminUser: User = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'admin@example.com',
  full_name: 'Admin User',
  phone_number: null,
  role: 'admin',
  avatar_url: null,
};

function renderLayout(adminId: string) {
  return AdminIdLayout({
    children: null,
    params: Promise.resolve({ adminId }),
  });
}

describe('AdminIdLayout segment guard', () => {
  beforeEach(() => {
    redirect.mockReset();
    getAdminUserOrRedirect.mockReset();
    adminLayoutProps.mockReset();
    sidebarCookie = undefined;
    getAdminUserOrRedirect.mockResolvedValue(adminUser);
  });

  it('always delegates authentication to getAdminUserOrRedirect', async () => {
    await renderLayout(adminUser.id);
    expect(getAdminUserOrRedirect).toHaveBeenCalledOnce();
  });

  it('does not redirect when the segment matches the authenticated admin', async () => {
    await renderLayout(adminUser.id);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to the admin own space when the segment does not match', async () => {
    await renderLayout('00000000-0000-0000-0000-000000000000');
    expect(redirect).toHaveBeenCalledWith(`/admin/${adminUser.id}`);
  });
});

/**
 * The sidebar rail's remembered state (RD11).
 *
 * `SidebarProvider` has always WRITTEN `sidebar_state` and the admin layout
 * never read it, so collapsing the rail did not survive a reload. These pin
 * the read AND its direction: the admin default is CLOSED, so an absent cookie
 * must not be read as "open" — that would change what every admin who has
 * never touched the rail sees.
 */
describe('AdminIdLayout sidebar persistence', () => {
  beforeEach(() => {
    redirect.mockReset();
    getAdminUserOrRedirect.mockReset();
    adminLayoutProps.mockReset();
    sidebarCookie = undefined;
    getAdminUserOrRedirect.mockResolvedValue(adminUser);
  });

  async function seededDefault(): Promise<boolean | undefined> {
    const tree = await renderLayout(adminUser.id);
    // Walk the returned element tree until AdminLayout renders and records
    // its props — AdminProvider passes children straight through.
    renderToStaticMarkup(tree as React.ReactElement);
    const props = adminLayoutProps.mock.calls.at(0)?.[0] as
      | { sidebarDefaultOpen?: boolean }
      | undefined;
    return props?.sidebarDefaultOpen;
  }

  it('starts collapsed when no preference has been recorded', async () => {
    expect(await seededDefault()).toBe(false);
  });

  it('opens the rail when the admin has expanded it', async () => {
    sidebarCookie = 'true';
    expect(await seededDefault()).toBe(true);
  });

  it('keeps the rail collapsed when the admin has collapsed it', async () => {
    sidebarCookie = 'false';
    expect(await seededDefault()).toBe(false);
  });
});
