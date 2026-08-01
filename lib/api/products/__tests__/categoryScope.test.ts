import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockClient),
}));

import { getCategoriesPaginated } from '../productQuery';

/**
 * The scoping rule, and why NULL is load-bearing: a category with no vertical
 * is GLOBAL, not unset. That is what makes the mapping safe to get wrong — an
 * unmapped or renamed row stays visible everywhere instead of vanishing from
 * every picker.
 */

function chain(result: {
  data: unknown;
  count: number | null;
  error: unknown;
}) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'or', 'order']) c[m] = vi.fn(() => c);
  c.range = vi.fn(async () => result);
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCategoriesPaginated — vertical scoping', () => {
  it('asks for this vertical OR the global rows', async () => {
    const c = chain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getCategoriesPaginated({ business_type_id: 'type-1' });

    expect(c.or).toHaveBeenCalledWith(
      'business_type_id.eq.type-1,business_type_id.is.null',
    );
  });

  it('applies no scope at all when the shop has no vertical', async () => {
    const c = chain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    // A null type is the pre-phase-5 behaviour: every category, no filter.
    await getCategoriesPaginated({ business_type_id: null });

    expect(c.or).not.toHaveBeenCalled();
  });

  it('is unscoped by default, so the admin view is unchanged', async () => {
    const c = chain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getCategoriesPaginated({});

    expect(c.or).not.toHaveBeenCalled();
  });

  it('keeps search and scope as separate conditions', async () => {
    const c = chain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getCategoriesPaginated({
      search: 'past',
      business_type_id: 'type-1',
    });

    // Two .or() calls are AND-ed by PostgREST — matching the search AND being
    // in scope. Collapsing them into one would return every global row for any
    // search term.
    expect((c.or as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });
});
