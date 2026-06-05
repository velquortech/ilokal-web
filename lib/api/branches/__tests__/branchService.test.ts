import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as q from '@/lib/api/branches/branchQuery';
import * as svc from '@/lib/api/branches/branchService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/api/branches/branchQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BRANCH_ID = 'br-00000000-0000-0000-0000-000000000001';
const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';

const mockBranch = {
  id: BRANCH_ID,
  business_id: BUSINESS_ID,
  name: 'Main Branch',
  address: '123 Iznart St.',
  location: null,
  phone: null,
  email: null,
  description: null,
  status: 'active',
  rejection_reason: null,
  cover_image_url: null,
  gallery_images: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
};

/** Builds a Supabase client mock for insert → select → single chains */
function makeInsertChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data, error })),
        })),
      })),
    })),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
}

/** Builds a Supabase client mock for update → eq → select → single chains */
function makeUpdateChain(
  data: unknown,
  error: { message: string } | null = null,
) {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data, error })),
          })),
        })),
      })),
    })),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
}

/** Builds a Supabase client mock for archive (update → eq, terminal) */
function makeArchiveChain(error: { message: string } | null = null) {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ error })) })),
    })),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
}

describe('branchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== createBranch =====

  describe('createBranch', () => {
    it('returns INTERNAL_ERROR when insert fails', async () => {
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeInsertChain(null, { message: 'db error' }),
      );
      const res = await svc.createBranch(BUSINESS_ID, {
        name: 'Test',
        address: '123 St.',
      });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });

    it('returns created branch on success without location', async () => {
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeInsertChain(mockBranch),
      );
      const res = await svc.createBranch(BUSINESS_ID, {
        name: 'Main Branch',
        address: '123 Iznart St.',
      });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('Main Branch');
      expect(res.data?.location).toBeNull();
    });

    it('inserts WKT POINT format when coordinates are provided', async () => {
      const insertFn = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockBranch, error: null })),
        })),
      }));
      const fromFn = vi.fn(() => ({ insert: insertFn }));
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: fromFn,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.createBranch(BUSINESS_ID, {
        name: 'Branch',
        address: '123 St.',
        latitude: 10.6973,
        longitude: 122.5649,
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'POINT(122.5649 10.6973)' }),
      );
    });

    it('inserts null location when coordinates are absent', async () => {
      const insertFn = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockBranch, error: null })),
        })),
      }));
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: vi.fn(() => ({ insert: insertFn })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.createBranch(BUSINESS_ID, {
        name: 'Branch',
        address: '123 St.',
      });

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({ location: null }),
      );
    });

    it('inserts branch_documents when business_permit_url is provided', async () => {
      const docInsertFn = vi.fn(() => Promise.resolve({ error: null }));
      const branchInsertFn = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: { ...mockBranch, id: BRANCH_ID },
            error: null,
          })),
        })),
      }));
      const fromFn = vi
        .fn()
        .mockReturnValueOnce({ insert: branchInsertFn }) // branches
        .mockReturnValueOnce({ insert: docInsertFn }); // branch_documents

      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: fromFn,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.createBranch(BUSINESS_ID, {
        name: 'Branch',
        address: '123 St.',
        business_permit_url: 'https://example.com/permit.pdf',
      });

      expect(docInsertFn).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            document_type: 'business_permit',
            file_url: 'https://example.com/permit.pdf',
          }),
        ]),
      );
    });
  });

  // ===== updateBranch =====

  describe('updateBranch', () => {
    it('returns NOT_FOUND when branch does not exist', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        false as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      const res = await svc.updateBranch(BRANCH_ID, { name: 'New' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('returns updated branch on success', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeUpdateChain({ ...mockBranch, name: 'New Name' }),
      );
      const res = await svc.updateBranch(BRANCH_ID, { name: 'New Name' });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('New Name');
    });

    it('returns INTERNAL_ERROR when update query fails', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeUpdateChain(null, { message: 'constraint violation' }),
      );
      const res = await svc.updateBranch(BRANCH_ID, { name: 'New' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });

    it('builds WKT POINT format when coordinates are updated', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      const updateFn = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: mockBranch, error: null })),
          })),
        })),
      }));
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: vi.fn(() => ({ update: updateFn })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.updateBranch(BRANCH_ID, {
        latitude: 10.6973,
        longitude: 122.5649,
      });

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'POINT(122.5649 10.6973)' }),
      );
    });
  });

  // ===== deleteBranch =====

  describe('deleteBranch', () => {
    it('returns NOT_FOUND when branch does not exist', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        false as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      const res = await svc.deleteBranch(BRANCH_ID);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('returns success when branch is archived', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeArchiveChain(),
      );
      const res = await svc.deleteBranch(BRANCH_ID);
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });

    it('returns INTERNAL_ERROR when archive query fails', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
        makeArchiveChain({ message: 'lock timeout' }),
      );
      const res = await svc.deleteBranch(BRANCH_ID);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });

    it('sets archived_at on the correct branch id', async () => {
      vi.mocked(q.branchExists).mockResolvedValueOnce(
        true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
      );
      const eqFn = vi.fn(() => ({ error: null }));
      const updateFn = vi.fn(() => ({ eq: eqFn }));
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: vi.fn(() => ({ update: updateFn })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.deleteBranch(BRANCH_ID);

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({ archived_at: expect.any(String) }),
      );
      expect(eqFn).toHaveBeenCalledWith('id', BRANCH_ID);
    });
  });
});
