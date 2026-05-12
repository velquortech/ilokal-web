/**
 * Admin Action Helpers Tests - Phase G
 * Tests for admin user management operations
 * Tests verifyCurrentUserIsAdmin, archiveUser, unarchiveUser, etc.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as adminHelpers from '../adminActionHelpers';
import {
  createServerSupabaseClient,
  createServerAdminClient,
} from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServerAdminClient: vi.fn(),
}));

describe('adminActionHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyCurrentUserIsAdmin', () => {
    it('should return authorized true when user is admin', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
          admin: { createUser: vi.fn(), deleteUser: vi.fn() },
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { role: 'admin' }, error: null }),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.verifyCurrentUserIsAdmin();
      expect(result.authorized).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return unauthorized when user is not admin', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: 'user-1' } } }),
          admin: { createUser: vi.fn(), deleteUser: vi.fn() },
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { role: 'user' }, error: null }),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.verifyCurrentUserIsAdmin();
      expect(result.authorized).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject when no user is authenticated', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
          admin: { createUser: vi.fn(), deleteUser: vi.fn() },
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.verifyCurrentUserIsAdmin();
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('archiveUser', () => {
    it('should soft-delete user by setting archived_at timestamp', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.archiveUser('user-1');
      expect(result.error).toBeNull();
    });

    it('should return error message on failure', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ error: { message: 'Database error' } }),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.archiveUser('user-1');
      expect(result.error).toBe('Database error');
    });

    it('should set user status to inactive', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      const supabaseClient = {
        from: vi.fn(() => ({
          update: mockUpdate,
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      await adminHelpers.archiveUser('user-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inactive',
          archived_at: expect.any(String),
        }),
      );
    });
  });

  describe('unarchiveUser', () => {
    it('should restore archived user by clearing archived_at', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.unarchiveUser('user-1');
      expect(result.error).toBeNull();
    });

    it('should set user status back to active', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      const supabaseClient = {
        from: vi.fn(() => ({
          update: mockUpdate,
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      await adminHelpers.unarchiveUser('user-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          archived_at: null,
        }),
      );
    });

    it('should return error message on failure', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ error: { message: 'User not found' } }),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.unarchiveUser('user-1');
      expect(result.error).toBe('User not found');
    });
  });

  describe('createAuthUser', () => {
    it('should create auth user with email and password', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn(),
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-123' } },
              error: null,
            }),
            deleteUser: vi.fn(),
          },
        },
      } as unknown as Awaited<ReturnType<typeof createServerAdminClient>>;

      (createServerAdminClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.createAuthUser(
        'test@example.com',
        'password123',
      );
      expect(result.userId).toBe('user-123');
      expect(result.error).toBeNull();
    });

    it('should return error if creation fails', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn(),
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User already exists' },
            }),
            deleteUser: vi.fn(),
          },
        },
      } as unknown as Awaited<ReturnType<typeof createServerAdminClient>>;

      (createServerAdminClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.createAuthUser(
        'test@example.com',
        'password123',
      );
      expect(result.userId).toBeNull();
      expect(result.error).toBe('User already exists');
    });
  });

  describe('deleteAuthUser', () => {
    it('should delete auth user successfully', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn(),
          admin: {
            createUser: vi.fn(),
            deleteUser: vi.fn().mockResolvedValue({ error: null }),
          },
        },
      } as unknown as Awaited<ReturnType<typeof createServerAdminClient>>;

      (createServerAdminClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.deleteAuthUser('user-1');
      expect(result.error).toBeNull();
    });

    it('should return error if deletion fails', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn(),
          admin: {
            createUser: vi.fn(),
            deleteUser: vi
              .fn()
              .mockResolvedValue({ error: { message: 'User not found' } }),
          },
        },
      } as unknown as Awaited<ReturnType<typeof createServerAdminClient>>;

      (createServerAdminClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await adminHelpers.deleteAuthUser('user-1');
      expect(result.error).toBe('User not found');
    });
  });
});
