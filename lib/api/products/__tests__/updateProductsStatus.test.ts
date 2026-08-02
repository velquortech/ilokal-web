/**
 * Bulk status update.
 *
 * The ownership scope lives in the WHERE clause, so these tests assert the
 * filter chain rather than a pre-flight read: an id belonging to another shop
 * must simply not match. `archived_at IS NULL` is part of that scope —
 * `deleteProduct` soft-deletes by setting `status='disabled'` plus
 * `archived_at`, and a bulk "set to Active" must not resurrect those rows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as svc from '@/lib/api/products/productService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BUSINESS_ID = 'biz-1';
const IDS = ['prod-1', 'prod-2'];

type UpdateResult = { count: number | null; error: unknown };
type UpdatePayload = Record<string, unknown>;
type UpdateOptions = { count?: 'exact' | 'planned' | 'estimated' };

function mockClient(result: UpdateResult) {
  // The chain terminates at `.is()` — the service reads `count`, so there is
  // no `.select()` to await. Parameters are typed so `mock.calls[0][0]` is a
  // real payload rather than the empty tuple an argless `vi.fn()` infers.
  const is = vi.fn(async (_col: string, _val: null) => result);
  const eq = vi.fn((_col: string, _val: string) => ({ is }));
  const inFn = vi.fn((_col: string, _vals: string[]) => ({ eq }));
  const update = vi.fn((_payload: UpdatePayload, _options?: UpdateOptions) => ({
    in: inFn,
  }));
  const from = vi.fn((_table: string) => ({ update }));

  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { from, update, in: inFn, eq, is };
}

describe('updateProductsStatus()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes the UPDATE to the ids, the business, and live rows', async () => {
    const m = mockClient({ count: 2, error: null });

    const res = await svc.updateProductsStatus(IDS, BUSINESS_ID, 'unlisted');

    expect(res.success).toBe(true);
    expect(res.data?.updated).toBe(2);
    expect(m.from).toHaveBeenCalledWith('products');
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unlisted' }),
      { count: 'exact' },
    );
    expect(m.in).toHaveBeenCalledWith('id', IDS);
    expect(m.eq).toHaveBeenCalledWith('business_id', BUSINESS_ID);
    expect(m.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('counts rather than returning a row payload', async () => {
    const m = mockClient({ count: 1, error: null });

    await svc.updateProductsStatus(['prod-1'], BUSINESS_ID, 'disabled');

    // Repo count rule: a count-only read must not carry rows back.
    expect(m.update.mock.calls[0][1]).toEqual({ count: 'exact' });
    expect(m).not.toHaveProperty('select');
  });

  it('never writes is_available — the DB trigger owns it', async () => {
    const m = mockClient({ count: 1, error: null });

    await svc.updateProductsStatus(['prod-1'], BUSINESS_ID, 'disabled');

    const payload = m.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('is_available');
    expect(payload).toHaveProperty('updated_at');
  });

  it('reports NOT_FOUND when nothing matched (another shop, or archived)', async () => {
    mockClient({ count: 0, error: null });

    const res = await svc.updateProductsStatus(IDS, BUSINESS_ID, 'active');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns a generic message on a DB error, not the driver text', async () => {
    mockClient({
      count: null,
      error: {
        code: '23514',
        message: 'products_status_check constraint violated',
      },
    });

    const res = await svc.updateProductsStatus(IDS, BUSINESS_ID, 'active');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
    expect(res.error?.message).not.toContain('constraint');
  });
});
