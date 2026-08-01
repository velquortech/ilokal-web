import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({ from: vi.fn() }));
const sectionBelongsToBusiness = vi.hoisted(() => vi.fn());

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockClient),
}));
vi.mock('@/lib/api/sections/sectionQuery', () => ({
  sectionBelongsToBusiness,
}));

import { getProductsPaginated } from '../productQuery';
import { createProduct } from '../productService';

/**
 * Phase 3 adds one filter and one guard, and both are load-bearing:
 *
 * - `'none'` is the Uncategorised chip. Without it the products with no
 *   section are reachable from no filter at all — which is exactly how 85 rows
 *   went missing from this page.
 * - A `section_id` from the client is NOT proof of ownership. The FK only says
 *   the row exists; attaching another shop's section would put their naming on
 *   this shop's public page.
 */

type Res = { data: unknown; count: number | null; error: unknown };

function queryChain(result: Res) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'or', 'eq', 'is', 'gte', 'lte', 'order']) {
    c[m] = vi.fn(() => c);
  }
  c.range = vi.fn(async () => result);
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  sectionBelongsToBusiness.mockResolvedValue(true);
});

describe('getProductsPaginated — section filter', () => {
  it("maps 'none' to section_id IS NULL", async () => {
    const c = queryChain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getProductsPaginated({ business_id: 'biz', section_id: 'none' });

    expect(c.is).toHaveBeenCalledWith('section_id', null);
    expect(c.eq).not.toHaveBeenCalledWith('section_id', 'none');
  });

  it('matches a real section by equality', async () => {
    const c = queryChain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getProductsPaginated({ business_id: 'biz', section_id: 'sec-1' });

    expect(c.eq).toHaveBeenCalledWith('section_id', 'sec-1');
  });

  it('applies no section filter at all when the chip is All', async () => {
    const c = queryChain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getProductsPaginated({ business_id: 'biz' });

    const sectionEq = (c.eq as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([col]) => col === 'section_id',
    );
    expect(sectionEq).toHaveLength(0);
    // `.is` is still used for archived_at — just never for section_id.
    const sectionIs = (c.is as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([col]) => col === 'section_id',
    );
    expect(sectionIs).toHaveLength(0);
  });

  it('embeds the section so the table can name it', async () => {
    const c = queryChain({ data: [], count: 0, error: null });
    mockClient.from.mockReturnValue(c);

    await getProductsPaginated({ business_id: 'biz' });

    const select = (c.select as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(select).toContain('section:section_id (id, name)');
  });
});

describe('createProduct — section ownership', () => {
  function insertChain(result: { data: unknown; error: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'eq', 'is', 'order', 'limit']) {
      c[m] = vi.fn(() => c);
    }
    c.single = vi.fn(async () => result);
    c.maybeSingle = vi.fn(async () => result);
    return c;
  }

  it("refuses a section that is not this shop's", async () => {
    sectionBelongsToBusiness.mockResolvedValue(false);
    mockClient.from.mockReturnValue(insertChain({ data: null, error: null }));

    const res = await createProduct('biz-1', {
      name: 'Flat White',
      price: 185,
      section_id: '11111111-1111-1111-1111-111111111111',
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
    expect(sectionBelongsToBusiness).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'biz-1',
    );
  });

  it('skips the ownership check when no section was given', async () => {
    mockClient.from.mockReturnValue(
      insertChain({ data: { id: 'p1' }, error: null }),
    );

    await createProduct('biz-1', { name: 'Flat White', price: 185 });

    expect(sectionBelongsToBusiness).not.toHaveBeenCalled();
  });

  it('stores NULL for an offering with no section', async () => {
    const c = insertChain({ data: { id: 'p1' }, error: null });
    mockClient.from.mockReturnValue(c);

    await createProduct('biz-1', { name: 'Flat White', price: 185 });

    expect(c.insert).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: null }),
    );
  });
});
