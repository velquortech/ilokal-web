/**
 * `verifyBusinessOwner` must only ever authorize the shop it was asked about.
 *
 * It used to treat a missing or falsy `businessId` as "find the caller's shop"
 * — `.eq('owner_id', user.id).limit(1)`, no ORDER BY — so for an owner with two
 * shops it answered with an arbitrary one, and every caller that forgot the id
 * (or passed an empty string) acted on the wrong shop. See
 * app/business/[businessId]/actions/__tests__/multiShopScoping.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const OWNER = 'owner-of-both';
const SHOP_A = '11111111-1111-4111-8111-111111111111';
const SHOP_B = '22222222-2222-4222-8222-222222222222';

// Records every table filter, so a test can prove which shop was looked up.
const filters: Array<[string, unknown]> = [];
const rowsById: Record<string, { id: string; owner_id: string }> = {
  [SHOP_A]: { id: SHOP_A, owner_id: OWNER },
  [SHOP_B]: { id: SHOP_B, owner_id: OWNER },
};

function query() {
  let wantedId: string | undefined;
  const q = {
    select: () => q,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      if (col === 'id') wantedId = val as string;
      return q;
    },
    is: () => q,
    limit: () => q,
    // The old owner fallback: the database hands back shop A.
    maybeSingle: async () => ({ data: rowsById[SHOP_A], error: null }),
    single: async () =>
      wantedId && rowsById[wantedId]
        ? { data: rowsById[wantedId], error: null }
        : { data: null, error: { message: 'not found' } },
  };
  return q;
}

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: OWNER } } }) },
    from: () => query(),
  }),
}));

import { verifyBusinessOwner } from '../verifyBusinessOwner';

beforeEach(() => {
  filters.length = 0;
});

describe('verifyBusinessOwner', () => {
  it('authorizes the shop it was asked about, for an owner of two', async () => {
    const result = await verifyBusinessOwner(SHOP_B);
    expect(result.authorized).toBe(true);
    expect(result.business?.id).toBe(SHOP_B);
  });

  it.each([
    ['an empty string', ''],
    ['undefined', undefined],
  ])(
    'refuses %s instead of falling back to some shop of the owner',
    async (_label, id) => {
      const result = await verifyBusinessOwner(id as unknown as string);
      expect(result.authorized).toBe(false);
      expect(result.error).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(result.business).toBeUndefined();
      // And it never went looking by owner.
      expect(filters.some(([col]) => col === 'owner_id')).toBe(false);
    },
  );
});
