/**
 * GET /api/mobile/business-types — filtered reference list.
 *
 * Claims under test:
 *  - the PostgREST select uses INNER joins (`business_categories!inner` and,
 *    inside it, `businesses!businesses_category_id_fkey!inner`) so only types
 *    that have a category with at least one business — and only those
 *    categories — come back;
 *  - the join is restricted to verified, unarchived businesses, matching the
 *    Explore feed contract (status='verified', archived_at IS NULL);
 *  - types/categories are ordered by name;
 *  - a DB error surfaces as a 500, never a cached empty list.
 */

import { describe, expect, it, vi } from 'vitest';

import { createBearerClient } from '@/supabase/bearer';
import { GET } from '../route';

vi.mock('@/supabase/bearer', () => ({
  createBearerClient: vi.fn(),
}));
// unstable_cache needs the Next incremental cache, which doesn't exist under
// vitest — pass the wrapped fn straight through so the DB read is testable.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

type QueryCall = {
  select: string;
  is: [string, unknown][];
  eqs: [string, unknown][];
  filters: [string, string, unknown][];
  orders: string[];
};

function buildClient(
  rows: unknown[],
  error: { message: string } | null = null,
) {
  const calls: QueryCall = {
    select: '',
    is: [],
    eqs: [],
    filters: [],
    orders: [],
  };
  const terminal = { data: rows, error };
  // Every chain method returns the same object, which is ALSO a thenable —
  // so `await supabase.from(...).select(...)` resolves to `terminal` no matter
  // which link in the chain is awaited.
  const chain = {
    select: vi.fn((sel: string) => {
      calls.select = sel;
      return chain;
    }),
    is: vi.fn((col: string, val: unknown) => {
      calls.is.push([col, val]);
      return chain;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.eqs.push([col, val]);
      return chain;
    }),
    filter: vi.fn((col: string, op: string, val: unknown) => {
      calls.filters.push([col, op, val]);
      return chain;
    }),
    order: vi.fn((col: string, opts?: { referencedTable?: string }) => {
      calls.orders.push(
        col + (opts?.referencedTable ? ` (${opts.referencedTable})` : ''),
      );
      return chain;
    }),
    then: (resolve: (v: typeof terminal) => void) => resolve(terminal),
  };
  const client = { from: vi.fn(() => chain) };
  vi.mocked(createBearerClient).mockReturnValue(
    client as unknown as ReturnType<typeof createBearerClient>,
  );
  return { calls, from: client.from };
}

const TYPES = [
  {
    id: 't1',
    name: 'Food & Beverage',
    description: null,
    icon: 'Coffee',
    business_categories: [
      {
        id: 'c1',
        name: 'Café',
        description: null,
        image_url: null,
        businesses: [{ id: 'b1' }],
      },
    ],
  },
];

describe('GET /api/mobile/business-types', () => {
  it('returns the reference list with only categories that have businesses', async () => {
    const { calls } = buildClient(TYPES);
    const res = await GET();
    expect(res.status).toBe(200);

    // The inner-join `businesses` ids are stripped from the payload — they only
    // drive the filter, so the reference list exposes types → categories and
    // never leaks business ids.
    const stripped = TYPES.map((t) => ({
      ...t,
      business_categories: t.business_categories.map(
        ({ businesses: _b, ...c }) => c,
      ),
    }));
    const body = await res.json();
    expect(body).toEqual({ business_types: stripped });
    expect(body.business_types[0].business_categories[0]).not.toHaveProperty(
      'businesses',
    );

    // The inner joins are the filter: a type only survives when it has a
    // category that has a business, and a category only when it has one.
    expect(calls.select).toContain('business_categories!inner(');
    expect(calls.select).toContain(
      'businesses!businesses_category_id_fkey!inner(id)',
    );

    // The join contract mirrors the Explore feed: verified + not archived.
    expect(calls.is).toEqual([['deleted_at', null]]);
    // Disabled rows (is_active = false, e.g. Tourism & Leisure on hold) are
    // hidden from the reference list at both the type and category level.
    expect(calls.eqs).toEqual([['is_active', true]]);
    expect(calls.filters).toEqual([
      ['business_categories.deleted_at', 'is', null],
      ['business_categories.is_active', 'eq', true],
      ['business_categories.businesses.status', 'eq', 'verified'],
      ['business_categories.businesses.archived_at', 'is', null],
    ]);
    // Deterministic ordering for the dropdown + chips.
    expect(calls.orders).toEqual(['name', 'name (business_categories)']);
  });

  it('drops types/categories entirely when the join yields no rows', async () => {
    const { calls } = buildClient([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ business_types: [] });
    expect(calls.select).toContain('!inner(');
  });

  it('surfaces a DB error as a 500, not an empty cached list', async () => {
    buildClient([], { message: 'boom' });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
