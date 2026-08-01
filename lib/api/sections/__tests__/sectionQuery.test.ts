import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockClient),
}));

import { getSectionsWithCounts } from '../sectionQuery';

type Res = { data: unknown; error: unknown };

function selectChain(result: Res) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is']) c[m] = vi.fn(() => c);
  let orderCalls = 0;
  // The second .order() is the terminal await (position, then created_at).
  c.order = vi.fn(() => (++orderCalls >= 2 ? Promise.resolve(result) : c));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSectionsWithCounts', () => {
  it('joins each section to its count and exposes the Uncategorised bucket', async () => {
    mockClient.from.mockReturnValue(
      selectChain({
        data: [
          { id: 'a', name: 'Hot Drinks', position: 0 },
          { id: 'b', name: 'Pastries', position: 1 },
        ],
        error: null,
      }),
    );
    mockClient.rpc.mockResolvedValue({
      data: [
        { section_id: 'a', product_count: 4 },
        { section_id: null, product_count: 9 },
      ],
      error: null,
    });

    const res = await getSectionsWithCounts('biz-1');

    expect(mockClient.rpc).toHaveBeenCalledWith('section_product_counts', {
      p_business_id: 'biz-1',
    });
    expect(res.sections.map((s) => [s.id, s.product_count])).toEqual([
      ['a', 4],
      // A section the RPC never mentioned has no products, not "unknown".
      ['b', 0],
    ]);
    expect(res.uncategorised_count).toBe(9);
    expect(res.error).toBeUndefined();
  });

  it('scopes the counts to a branch when one is given', async () => {
    mockClient.from.mockReturnValue(selectChain({ data: [], error: null }));
    mockClient.rpc.mockResolvedValue({ data: [], error: null });

    await getSectionsWithCounts('biz-1', 'branch-9');

    expect(mockClient.rpc).toHaveBeenCalledWith('section_product_counts', {
      p_business_id: 'biz-1',
      p_branch_id: 'branch-9',
    });
  });

  it('still returns the sections when only the counts RPC fails', async () => {
    mockClient.from.mockReturnValue(
      selectChain({ data: [{ id: 'a', name: 'Hot Drinks' }], error: null }),
    );
    mockClient.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'missing function' },
    });

    const res = await getSectionsWithCounts('biz-1');

    // Names still render, but the caller is told the zeroes are placeholders:
    // the archive dialog used to read them as "this section is empty" right
    // before moving real offerings to Uncategorised.
    expect(res.sections).toHaveLength(1);
    expect(res.sections[0].product_count).toBe(0);
    expect(res.counts_failed).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('does not flag counts_failed on the happy path', async () => {
    mockClient.from.mockReturnValue(
      selectChain({ data: [{ id: 'a', name: 'Hot Drinks' }], error: null }),
    );
    mockClient.rpc.mockResolvedValue({ data: [], error: null });

    const res = await getSectionsWithCounts('biz-1');

    expect(res.counts_failed).toBeUndefined();
  });

  it('reports LOAD_FAILED when the sections read itself fails', async () => {
    mockClient.from.mockReturnValue(
      selectChain({ data: null, error: { code: '42501', message: 'denied' } }),
    );
    mockClient.rpc.mockResolvedValue({ data: [], error: null });

    const res = await getSectionsWithCounts('biz-1');

    expect(res.error).toBe('LOAD_FAILED');
    expect(res.sections).toEqual([]);
  });

  it('short-circuits without a business id', async () => {
    const res = await getSectionsWithCounts('');
    expect(res).toEqual({ sections: [], uncategorised_count: 0 });
    expect(mockClient.from).not.toHaveBeenCalled();
  });

  it('never throws when the client itself blows up', async () => {
    mockClient.from.mockImplementation(() => {
      throw new Error('connection reset');
    });

    const res = await getSectionsWithCounts('biz-1');

    expect(res.error).toBe('LOAD_FAILED');
  });
});
