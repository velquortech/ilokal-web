/**
 * getBusinessesPaginated query tests — verifies search + sort target the real
 * `shop_name` column (renamed from `name` in 20260418094212), so the admin
 * Business Documents search/filter/sort actually work.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { getBusinessesPaginated } from '../businessQuery';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

interface QueryBuilder {
  select: Mock;
  eq: Mock;
  or: Mock;
  order: Mock;
  range: Mock;
}

function makeClient() {
  const builder: Partial<QueryBuilder> = {};
  const chain = () => builder as QueryBuilder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.order = vi.fn(chain);
  // terminal — awaited
  builder.range = vi
    .fn()
    .mockResolvedValue({ data: [], error: null, count: 0 });
  const client = { from: vi.fn(() => builder as QueryBuilder) };
  return { client, builder: builder as QueryBuilder };
}

beforeEach(() => vi.clearAllMocks());

describe('getBusinessesPaginated', () => {
  it('searches against shop_name (not the renamed-away name column)', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ search: 'cafe' });

    expect(builder.or).toHaveBeenCalledTimes(1);
    const filter = (builder.or as Mock).mock.calls[0][0] as string;
    expect(filter).toContain('shop_name.ilike.%cafe%');
    // must not reference the bare (renamed-away) `name` column
    expect(filter.startsWith('name.ilike')).toBe(false);
    expect(filter).not.toContain(',name.ilike');
  });

  it('sorts by shop_name when sortBy is name', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ sortBy: 'name', sortOrder: 'asc' });

    expect(builder.order).toHaveBeenCalledWith('shop_name', {
      ascending: true,
    });
  });

  it('applies the status filter when not "all"', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ status: 'pending' });

    expect(builder.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('does not filter status when "all"', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ status: 'all' });

    expect(builder.eq).not.toHaveBeenCalled();
  });

  it('paginates with range based on page + pageSize', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ page: 2, pageSize: 10 });

    // page 2, size 10 → offset 10..19
    expect(builder.range).toHaveBeenCalledWith(10, 19);
  });
});
