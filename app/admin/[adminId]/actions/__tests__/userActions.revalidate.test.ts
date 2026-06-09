/**
 * userActions revalidation test
 * After the `/admin` → `/admin/[adminId]` migration, mutations must revalidate
 * at the layout level so every nested dynamic-segment page is refreshed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUser, AdminCreateUserInput } from '@/lib/types/admin';

const revalidatePath = vi.fn();
const verifyCurrentUserIsAdmin = vi.fn();
const createAdmin = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

vi.mock('@/lib/api/admin/adminActionHelpers', () => ({
  verifyCurrentUserIsAdmin: () => verifyCurrentUserIsAdmin(),
}));

vi.mock('@/lib/services/adminService', () => ({
  default: {
    createAdmin: (data: AdminCreateUserInput) => createAdmin(data),
  },
}));

import { createAdminAction } from '../userActions';

const newAdmin: AdminUser = {
  id: '55555555-5555-5555-5555-555555555555',
  email: 'new-admin@example.com',
  full_name: 'New Admin',
  role: 'admin',
} as AdminUser;

const input: AdminCreateUserInput = {
  email: 'new-admin@example.com',
  full_name: 'New Admin',
  password: 'SecurePass123',
  role: 'admin',
} as AdminCreateUserInput;

describe('createAdminAction revalidation', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    verifyCurrentUserIsAdmin.mockReset();
    createAdmin.mockReset();
  });

  it('revalidates the admin layout on success', async () => {
    verifyCurrentUserIsAdmin.mockResolvedValue({ authorized: true });
    createAdmin.mockResolvedValue({ data: newAdmin, error: null });

    const result = await createAdminAction(input);

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('does not revalidate when unauthorized', async () => {
    verifyCurrentUserIsAdmin.mockResolvedValue({
      authorized: false,
      error: 'Only admins can perform this action',
    });

    const result = await createAdminAction(input);

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
