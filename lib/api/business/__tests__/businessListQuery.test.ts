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
  ilike: Mock;
  order: Mock;
  range: Mock;
}

function makeClient() {
  const builder: Partial<QueryBuilder> = {};
  const chain = () => builder as QueryBuilder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.ilike = vi.fn(chain);
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
  it('searches the base shop_name column (renamed-away `name`; no embedded owner OR)', async () => {
    const { client, builder } = makeClient();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await getBusinessesPaginated({ search: 'cafe' });

    // Single base-table ILIKE — not an .or() across the embedded `owner` table,
    // which would make PostgREST error and return zero rows.
    expect(builder.ilike).toHaveBeenCalledWith('shop_name', '%cafe%');
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
