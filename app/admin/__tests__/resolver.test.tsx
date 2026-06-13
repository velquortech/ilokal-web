/**
 * Admin index resolver integration test
 * `app/admin/page.tsx` must resolve the authenticated admin and redirect to
 * their `/admin/[adminId]` space.
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

import AdminIndexPage from '../page';

const adminUser: User = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'admin@example.com',
  full_name: 'Admin User',
  phone_number: null,
  role: 'admin',
  avatar_url: null,
};

describe('AdminIndexPage resolver', () => {
  beforeEach(() => {
    redirect.mockReset();
    getAdminUserOrRedirect.mockReset();
  });

  it('redirects to the admin space of the authenticated user', async () => {
    getAdminUserOrRedirect.mockResolvedValue(adminUser);

    await AdminIndexPage();

    expect(getAdminUserOrRedirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith(`/admin/${adminUser.id}`);
  });
});
