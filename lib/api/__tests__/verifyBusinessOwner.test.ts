/**
 * Business Owner Verification Tests - Phase G
 * Tests for business ownership validation and authorization
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { verifyBusinessOwner } from '../verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('verifyBusinessOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with businessId provided', () => {
    it('should authorize owner accessing their business', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    owner_id: 'user-1',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.authorized).toBe(true);
      expect(result.user?.id).toBe('user-1');
      expect(result.business?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject non-owner accessing business', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    owner_id: 'user-2',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'FORBIDDEN' });
    });

    it('should reject archived business access', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn(),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should reject invalid UUID format', async () => {
      const supabaseClient = {
        from: vi.fn(),
        auth: { getUser: vi.fn() },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner('not-a-uuid');

      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('should allow admin to access any business', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    owner_id: 'user-2',
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner(
        '550e8400-e29b-41d4-a716-446655440000',
        { user: { id: 'admin-1' }, profile: { role: 'admin' } },
      );

      expect(result.authorized).toBe(true);
    });
  });

  describe('without businessId (legacy behavior)', () => {
    it('should find business owned by current user', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: '550e8400-e29b-41d4-a716-446655440000' },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner();

      expect(result.authorized).toBe(true);
      expect(result.user?.id).toBe('user-1');
    });

    it('should reject when user not authenticated', async () => {
      const supabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner();

      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'AUTHENTICATION_ERROR' });
    });

    it('should reject when user has no business', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner();

      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'NOT_FOUND' });
    });

    it('should use provided auth context instead of session', async () => {
      const supabaseClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: '550e8400-e29b-41d4-a716-446655440000' },
                error: null,
              }),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn(), // Should not be called
        },
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await verifyBusinessOwner(undefined, {
        user: { id: 'user-1' },
        profile: { role: 'business_owner' },
      });

      expect(result.authorized).toBe(true);
      expect(supabaseClient.auth.getUser).not.toHaveBeenCalled();
    });
  });
});
