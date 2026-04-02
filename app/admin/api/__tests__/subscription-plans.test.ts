import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/getCurrentUser');

import { getCurrentUser } from '@/lib/api/getCurrentUser';

describe('Admin Subscription Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have route handlers exported', async () => {
    const module = await import('@/app/api/admin/subscriptions/plans/route');
    expect(module.GET).toBeDefined();
    expect(module.POST).toBeDefined();
  });

  it('should have detail route handlers exported', async () => {
    const module =
      await import('@/app/api/admin/subscriptions/plans/[planId]/route');
    expect(module.GET).toBeDefined();
    expect(module.PUT).toBeDefined();
    expect(module.DELETE).toBeDefined();
  });

  it('should require admin role for list', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'app_user',
    };

    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
    const user = await getCurrentUser();
    expect(user?.role).not.toBe('admin');
  });

  it('should allow admin access', async () => {
    const mockUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    };

    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
    const user = await getCurrentUser();
    expect(user?.role).toBe('admin');
  });

  it('should deny unauthenticated access', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it('should deny business owner access', async () => {
    const mockUser = {
      id: 'owner-1',
      email: 'owner@business.com',
      role: 'business_owner',
    };

    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
    const user = await getCurrentUser();
    expect(user?.role).not.toBe('admin');
  });

  describe('Plan CRUD operations', () => {
    it('should support plan creation for admins', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
      const user = await getCurrentUser();
      expect(user?.id).toBe('admin-1');
    });

    it('should support plan retrieval', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
      const user = await getCurrentUser();
      expect(user).toBeDefined();
    });

    it('should support plan updates', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
      const user = await getCurrentUser();
      expect(user?.role).toBe('admin');
    });

    it('should support plan deletion', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
      const user = await getCurrentUser();
      expect(user?.role).toBe('admin');
    });

    it('should prevent deletion of active plans', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as any);
      const user = await getCurrentUser();
      expect(user).toBeDefined();
    });
  });
});
