/**
 * Branch Query Tests - Fixed with proper mock chains
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getBranchesPaginated,
  getBranchById,
  getBranchesByBusinessId,
  branchExists,
} from '../branchQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('branchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBranchesPaginated', () => {
    it('should return paginated branches for business', async () => {
      const mockBranches = [
        {
          id: 'branch-1',
          business_id: 'biz-1',
          name: 'Main Branch',
          city: 'New York',
        },
        {
          id: 'branch-2',
          business_id: 'biz-1',
          name: 'Downtown',
          city: 'Los Angeles',
        },
      ];

      // Build the query chain: .from().select().is().order().range()
      const range = vi
        .fn()
        .mockResolvedValue({ data: mockBranches, count: 2, error: null });
      const order = vi.fn().mockReturnValue({ range });
      const is = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ is });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchesPaginated({ page: 1, per_page: 20 });

      expect(result.branches).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should return empty array if no branches exist', async () => {
      const range = vi
        .fn()
        .mockResolvedValue({ data: [], count: 0, error: null });
      const order = vi.fn().mockReturnValue({ range });
      const is = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ is });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchesPaginated({ page: 1, per_page: 20 });

      expect(result.branches).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getBranchById', () => {
    it('should return branch with full details by ID', async () => {
      const mockBranch = {
        id: 'branch-1',
        business_id: 'biz-1',
        name: 'Main Branch',
        address: '123 Main St',
        city: 'New York',
        archived_at: null,
      };

      // Query chain: .from().select().eq().is().single()
      const single = vi
        .fn()
        .mockResolvedValue({ data: mockBranch, error: null });
      const is = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchById('branch-1');

      expect(result.branch).toHaveProperty('id');
      expect(result.branch?.name).toBe('Main Branch');
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent branch', async () => {
      const single = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const is = vi.fn().mockReturnValue({ single });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchById('nonexistent');

      expect(result.branch).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('getBranchesByBusinessId', () => {
    it('should return all active branches for business', async () => {
      const mockBranches = [
        {
          id: 'branch-1',
          business_id: 'biz-1',
          name: 'Main',
          archived_at: null,
        },
        {
          id: 'branch-2',
          business_id: 'biz-1',
          name: 'Downtown',
          archived_at: null,
        },
      ];

      // Query chain: .from().select().eq().is().order().range()
      const range = vi
        .fn()
        .mockResolvedValue({ data: mockBranches, count: 2, error: null });
      const order = vi.fn().mockReturnValue({ range });
      const is = vi.fn().mockReturnValue({ order });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchesByBusinessId('biz-1');

      expect(result.branches).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should return 0 branches if none exist', async () => {
      const range = vi
        .fn()
        .mockResolvedValue({ data: [], count: 0, error: null });
      const order = vi.fn().mockReturnValue({ range });
      const is = vi.fn().mockReturnValue({ order });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await getBranchesByBusinessId('biz-1');

      expect(result.branches).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('branchExists', () => {
    it('should return true when branch exists', async () => {
      // Query chain: .from().select().eq().is()
      const is = vi.fn().mockResolvedValue({ count: 1, error: null });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await branchExists('branch-1');

      expect(result).toBe(true);
    });

    it('should return false when branch does not exist', async () => {
      const is = vi.fn().mockResolvedValue({ count: 0, error: null });
      const eq = vi.fn().mockReturnValue({ is });
      const select = vi.fn().mockReturnValue({ eq });

      const supabaseClient = {
        from: vi.fn().mockReturnValue({ select }),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        supabaseClient,
      );

      const result = await branchExists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
