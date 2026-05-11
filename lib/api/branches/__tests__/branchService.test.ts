import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as q from '@/lib/api/branches/branchQuery';
import * as svc from '@/lib/api/branches/branchService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/api/branches/branchQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('branchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default supabase client mock used by service functions
    const defaultClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null, data: null })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      defaultClient,
    );
  });

  it('createBranch returns INTERNAL_ERROR when insert fails', async () => {
    const supabaseClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: null,
              error: { message: 'db' },
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.createBranch('b1', {
      name: 'Test',
      address: '',
    } as unknown as Parameters<typeof svc.createBranch>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('updateBranch returns NOT_FOUND when branch does not exist', async () => {
    vi.mocked(q.branchExists).mockResolvedValueOnce(
      false as unknown as Awaited<ReturnType<typeof q.branchExists>>,
    );
    const res = await svc.updateBranch('br1', {
      name: 'New',
    } as unknown as Parameters<typeof svc.updateBranch>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('updateBranch succeeds when branch exists and update works', async () => {
    vi.mocked(q.branchExists).mockResolvedValueOnce(
      true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
    );
    const supabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'br1' }, error: null })),
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.updateBranch('br1', {
      name: 'New',
    } as unknown as Parameters<typeof svc.updateBranch>[1]);
    expect(res.success).toBe(true);
  });

  it('deleteBranch succeeds when branch exists and archive works', async () => {
    vi.mocked(q.branchExists).mockResolvedValueOnce(
      true as unknown as Awaited<ReturnType<typeof q.branchExists>>,
    );

    const supabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.deleteBranch('br1');
    expect(res.success).toBe(true);
  });
});
