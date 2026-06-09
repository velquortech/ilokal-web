/**
 * Admin [adminId] layout integration test
 * Guards the dynamic segment: delegates auth to getAdminUserOrRedirect and
 * redirects to the caller's own admin space when the URL segment doesn't match.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@/lib/types/user';

const redirect = vi.fn();
const getAdminUserOrRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}));

vi.mock('@/lib/api/getCurrentUser', () => ({
  getAdminUserOrRedirect: () => getAdminUserOrRedirect(),
}));

// Keep the heavy client shell out of the unit env — we only assert guard logic.
vi.mock('../components/AdminLayout', () => ({
  default: () => null,
}));

vi.mock('@/providers/AdminProvider', () => ({
  AdminProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
