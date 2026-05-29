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

/**
 * Builds a fully chainable Supabase query mock.
 * Every chainable method returns `chain` itself so multi-step
 * query builds (e.g. .eq().is().eq().or().order()) always work.
 * Terminal methods (range, single) return resolved promises.
 */
function makeChain(
  data: unknown,
  count: number | null = 0,
  error: unknown = null,
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'is', 'or', 'order', 'not', 'neq']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.range = vi.fn().mockResolvedValue({ data, count, error });
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function mockClient(chain: ReturnType<typeof makeChain>) {
  const client = { from: vi.fn().mockReturnValue(chain) } as unknown as Awaited<
    ReturnType<typeof createServerSupabaseClient>
  >;
  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(client);
  return client;
}

const mockBranch = {
  id: 'branch-1',
  business_id: 'biz-1',
  name: 'Main Branch',
  address: '123 Main St',
  archived_at: null,
};

describe('branchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== getBranchesPaginated =====

  describe('getBranchesPaginated', () => {
    it('returns paginated branches', async () => {
      const chain = makeChain([mockBranch], 1);
      mockClient(chain);
      const result = await getBranchesPaginated({ page: 1, per_page: 20 });
      expect(result.branches).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('returns empty array when no branches exist', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      const result = await getBranchesPaginated({ page: 1, per_page: 20 });
      expect(result.branches).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('calculates correct pagination offset for page 3', async () => {
      const chain = makeChain([], 100);
      mockClient(chain);
      await getBranchesPaginated({ page: 3, per_page: 10 });
      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it('calculates total_pages correctly', async () => {
      const chain = makeChain([], 25);
      mockClient(chain);
      const result = await getBranchesPaginated({ page: 1, per_page: 10 });
      expect(result.total_pages).toBe(3);
    });

    it('applies search filter with ilike or clause', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20, search: 'main' });
      expect(chain.or).toHaveBeenCalledWith(
        'name.ilike.%main%,address.ilike.%main%',
      );
    });

    it('does not apply or clause when search is absent', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20 });
      expect(chain.or).not.toHaveBeenCalled();
    });

    it('sorts by name ascending by default', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20, sort_by: 'name_asc' });
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('sorts by name descending when sort_by is name_desc', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20, sort_by: 'name_desc' });
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: false });
    });

    it('sorts by created_at descending when sort_by is newest', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20, sort_by: 'newest' });
      expect(chain.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('sorts by created_at ascending when sort_by is oldest', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesPaginated({ page: 1, per_page: 20, sort_by: 'oldest' });
      expect(chain.order).toHaveBeenCalledWith('created_at', {
        ascending: true,
      });
    });

    it('returns error field on database failure', async () => {
      const chain = makeChain(null, null, { message: 'connection refused' });
      mockClient(chain);
      const result = await getBranchesPaginated({ page: 1, per_page: 20 });
      expect(result.branches).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });

  // ===== getBranchById =====

  describe('getBranchById', () => {
    it('returns branch when found', async () => {
      const chain = makeChain(mockBranch);
      mockClient(chain);
      const result = await getBranchById('branch-1');
      expect(result.branch?.name).toBe('Main Branch');
      expect(result.error).toBeUndefined();
    });

    it('returns error for non-existent branch', async () => {
      const chain = makeChain(null, null, { message: 'Not found' });
      mockClient(chain);
      const result = await getBranchById('nonexistent');
      expect(result.branch).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('filters by archived_at is null', async () => {
      const chain = makeChain(mockBranch);
      mockClient(chain);
      await getBranchById('branch-1');
      expect(chain.is).toHaveBeenCalledWith('archived_at', null);
    });
  });

  // ===== getBranchesByBusinessId =====

  describe('getBranchesByBusinessId', () => {
    it('returns branches for a business', async () => {
      const chain = makeChain([mockBranch], 1);
      mockClient(chain);
      const result = await getBranchesByBusinessId('biz-1', { status: 'all' });
      expect(result.branches).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns empty array when no branches exist', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      const result = await getBranchesByBusinessId('biz-1', { status: 'all' });
      expect(result.branches).toHaveLength(0);
    });

    it('filters by business_id', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'all' });
      expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    });

    it('filters by status active when status is active', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'active' });
      expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('filters by status active when no status provided (default)', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1');
      expect(chain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('filters by specific status when status is pending_review', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'pending_review' });
      expect(chain.eq).toHaveBeenCalledWith('status', 'pending_review');
    });

    it('does not filter by status when status is all', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'all' });
      const eqCalls = chain.eq.mock.calls;
      const statusCall = eqCalls.find(([col]: [string]) => col === 'status');
      expect(statusCall).toBeUndefined();
    });

    it('applies search filter', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'all', search: 'main' });
      expect(chain.or).toHaveBeenCalledWith(
        'name.ilike.%main%,address.ilike.%main%',
      );
    });

    it('sorts by name ascending by default', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', { status: 'all', sort_by: 'name_asc' });
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('sorts by name descending when sort_by is name_desc', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', {
        status: 'all',
        sort_by: 'name_desc',
      });
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: false });
    });

    it('sorts by newest when sort_by is newest', async () => {
      const chain = makeChain([], 0);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', {
        status: 'all',
        sort_by: 'newest',
      });
      expect(chain.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('calculates correct pagination offset', async () => {
      const chain = makeChain([], 50);
      mockClient(chain);
      await getBranchesByBusinessId('biz-1', {
        status: 'all',
        page: 3,
        per_page: 10,
      });
      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it('returns error field on database failure', async () => {
      const chain = makeChain(null, null, { message: 'DB error' });
      mockClient(chain);
      const result = await getBranchesByBusinessId('biz-1', { status: 'all' });
      expect(result.branches).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });

  // ===== branchExists =====

  describe('branchExists', () => {
    it('returns true when branch exists', async () => {
      const chain = makeChain(null, 1);
      chain.is = vi.fn().mockResolvedValue({ count: 1, error: null });
      mockClient(chain);
      const result = await branchExists('branch-1');
      expect(result).toBe(true);
    });

    it('returns false when branch does not exist', async () => {
      const chain = makeChain(null, 0);
      chain.is = vi.fn().mockResolvedValue({ count: 0, error: null });
      mockClient(chain);
      const result = await branchExists('nonexistent');
      expect(result).toBe(false);
    });

    it('returns false when an exception is thrown', async () => {
      (createServerSupabaseClient as unknown as Mock).mockRejectedValueOnce(
        new Error('connection failed'),
      );
      const result = await branchExists('branch-1');
      expect(result).toBe(false);
    });
  });
});
