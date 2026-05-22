import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as productQuery from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';
import {
  mockProduct,
  mockProductInactive,
  mockProductOnSale,
  BUSINESS_ID,
} from '../../mockData/products.mock';
import { mockCategory } from '../../mockData/categories.mock';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/product-helper', () => ({
  normalizeProductSale: vi.fn((p) => p),
}));

type ChainedMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
};

function buildChain(overrides: Partial<ChainedMock> = {}): ChainedMock {
  const chain: ChainedMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return chain;
}

function mockSupabase(chain: ChainedMock) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from: vi.fn(() => chain),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

// ===== applySaleToProduct =====

describe('applySaleToProduct()', () => {
  it('updates sale_price and timestamps and returns the updated product', async () => {
    const updatedProduct = { ...mockProduct, sale_price: 140 };
    const chain = buildChain();
    chain.single.mockResolvedValue({ data: updatedProduct, error: null });
    chain.update = vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single: chain.single })) })),
    }));
    mockSupabase(chain);

    const result = await productQuery.applySaleToProduct(mockProduct.id, {
      sale_price: 140,
      sale_starts_at: '2026-01-01T00:00:00Z',
      sale_ends_at: '2026-12-31T23:59:59Z',
    });

    expect('product' in result).toBe(true);
    if ('product' in result) {
      expect((result.product as typeof updatedProduct).sale_price).toBe(140);
    }
  });

  it('returns error when DB update fails', async () => {
    const chain = buildChain();
    chain.single.mockResolvedValue({
      data: null,
      error: { message: 'update failed' },
    });
    chain.update = vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single: chain.single })) })),
    }));
    mockSupabase(chain);

    const result = await productQuery.applySaleToProduct(mockProduct.id, {
      sale_price: 140,
    });

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('update failed');
    }
  });

  it('sets sale_starts_at and sale_ends_at to null when not provided', async () => {
    const updatedProduct = {
      ...mockProduct,
      sale_price: 100,
      sale_starts_at: null,
      sale_ends_at: null,
    };
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: updatedProduct, error: null }),
        })),
      })),
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ update: updateSpy })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    await productQuery.applySaleToProduct(mockProduct.id, { sale_price: 100 });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sale_starts_at: null, sale_ends_at: null }),
    );
  });
});

// ===== removeSaleFromProduct =====

describe('removeSaleFromProduct()', () => {
  it('clears sale fields and returns the updated product', async () => {
    const clearedProduct = {
      ...mockProductOnSale,
      sale_price: null,
      sale_starts_at: null,
      sale_ends_at: null,
    };
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: clearedProduct, error: null }),
        })),
      })),
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ update: updateSpy })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    const result = await productQuery.removeSaleFromProduct(mockProductOnSale.id);

    expect('product' in result).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sale_price: null,
        sale_starts_at: null,
        sale_ends_at: null,
      }),
    );
  });

  it('returns error when DB update fails', async () => {
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'connection reset' },
          }),
        })),
      })),
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => ({ update: updateSpy })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    const result = await productQuery.removeSaleFromProduct(mockProductOnSale.id);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('connection reset');
    }
  });
});

// ===== getProductStatsByBusiness =====

describe('getProductStatsByBusiness()', () => {
  it('returns correct counts for each status', async () => {
    const rows = [
      { status: 'active' },
      { status: 'active' },
      { status: 'inactive' },
      { status: 'archived' },
    ];
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    mockSupabase(chain);

    const result = await productQuery.getProductStatsByBusiness(BUSINESS_ID);

    expect(result.total).toBe(4);
    expect(result.active).toBe(2);
    expect(result.inactive).toBe(1);
    expect(result.archived).toBe(1);
  });

  it('returns all zeros when no products exist', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(chain);

    const result = await productQuery.getProductStatsByBusiness(BUSINESS_ID);

    expect(result).toEqual({ total: 0, active: 0, inactive: 0, archived: 0 });
  });

  it('returns all zeros on DB error', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });
    mockSupabase(chain);

    const result = await productQuery.getProductStatsByBusiness(BUSINESS_ID);

    expect(result).toEqual({ total: 0, active: 0, inactive: 0, archived: 0 });
  });

  it('correctly handles a business with only archived products', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({
      data: [{ status: 'archived' }, { status: 'archived' }],
      error: null,
    });
    mockSupabase(chain);

    const result = await productQuery.getProductStatsByBusiness(BUSINESS_ID);

    expect(result.archived).toBe(2);
    expect(result.active).toBe(0);
    expect(result.inactive).toBe(0);
  });
});

// ===== countProductsByBusiness =====

describe('countProductsByBusiness()', () => {
  it('returns the count from the DB', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({ count: 7, error: null });
    mockSupabase(chain);

    const result = await productQuery.countProductsByBusiness(BUSINESS_ID);

    expect(result).toBe(7);
  });

  it('returns 0 when no products exist', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({ count: 0, error: null });
    mockSupabase(chain);

    const result = await productQuery.countProductsByBusiness(BUSINESS_ID);

    expect(result).toBe(0);
  });

  it('returns 0 on DB error', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({
      count: null,
      error: { message: 'timeout' },
    });
    mockSupabase(chain);

    const result = await productQuery.countProductsByBusiness(BUSINESS_ID);

    expect(result).toBe(0);
  });

  it('returns 0 when count is null but no error', async () => {
    const chain = buildChain();
    chain.eq = vi.fn().mockResolvedValue({ count: null, error: null });
    mockSupabase(chain);

    const result = await productQuery.countProductsByBusiness(BUSINESS_ID);

    expect(result).toBe(0);
  });
});

// ===== getProductsByCategory =====

describe('getProductsByCategory()', () => {
  it('returns active products for a category', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [mockProduct, mockProductOnSale],
      error: null,
    });
    mockSupabase(chain);

    const result = await productQuery.getProductsByCategory(mockCategory.id);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when category has no active products', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(chain);

    const result = await productQuery.getProductsByCategory(mockCategory.id);

    expect(result).toHaveLength(0);
  });

  it('returns null on DB error', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    });
    mockSupabase(chain);

    const result = await productQuery.getProductsByCategory(mockCategory.id);

    expect(result).toBeNull();
  });

  it('filters by status=active', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(chain);

    await productQuery.getProductsByCategory(mockCategory.id);

    expect(chain.eq).toHaveBeenCalledWith('status', 'active');
  });
});

// ===== getProductsPaginated — sorting variants =====

describe('getProductsPaginated() — sort_by variants', () => {
  let chain: ChainedMock;

  beforeEach(() => {
    chain = buildChain();
    chain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(chain);
  });

  it.each([
    ['oldest', 'created_at', true],
    ['name_asc', 'name', true],
    ['name_desc', 'name', false],
    ['price_low', 'price', true],
    ['price_high', 'price', false],
    ['newest', 'created_at', false],
  ] as const)(
    'sort_by="%s" calls order(%s, { ascending: %s })',
    async (sort_by, field, ascending) => {
      await productQuery.getProductsPaginated({ page: 1, per_page: 10, sort_by });
      expect(chain.order).toHaveBeenCalledWith(field, { ascending });
    },
  );
});

// ===== getProductsPaginated — pagination edge cases =====

describe('getProductsPaginated() — pagination', () => {
  it('computes correct offset for page 3 with per_page 5', async () => {
    const chain = buildChain();
    chain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(chain);

    await productQuery.getProductsPaginated({ page: 3, per_page: 5 });

    expect(chain.range).toHaveBeenCalledWith(10, 14);
  });

  it('returns total_pages computed from count', async () => {
    const chain = buildChain();
    chain.range = vi.fn().mockResolvedValue({ data: [], count: 25, error: null });
    mockSupabase(chain);

    const result = await productQuery.getProductsPaginated({ page: 1, per_page: 10 });

    if ('total_pages' in result) {
      expect(result.total_pages).toBe(3);
    }
  });
});

// ===== getProductById — select fields =====

describe('getProductById()', () => {
  it('selects category and business join fields', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({
      data: { ...mockProduct, category: mockCategory, business: { id: BUSINESS_ID, shop_name: 'Test' } },
      error: null,
    });
    mockSupabase(chain);

    const result = await productQuery.getProductById(mockProduct.id);

    expect('product' in result).toBe(true);
    expect(chain.select).toHaveBeenCalledWith(
      expect.stringContaining('category:category_id'),
    );
  });

  it('returns "Product not found" error message on missing product', async () => {
    const chain = buildChain();
    chain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });
    mockSupabase(chain);

    const result = await productQuery.getProductById('nonexistent-id');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Product not found');
    }
  });
});

// ===== getProductsByBusinessId — mixed products =====

describe('getProductsByBusinessId() — status filter', () => {
  it('does not add status filter when status is undefined', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(chain);

    await productQuery.getProductsByBusinessId(BUSINESS_ID);

    const eqCalls = chain.eq.mock.calls.map((c) => c[0]);
    expect(eqCalls).not.toContain('status');
  });

  it('returns products including inactive when no status filter is given', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [mockProduct, mockProductInactive],
      error: null,
    });
    mockSupabase(chain);

    const result = await productQuery.getProductsByBusinessId(BUSINESS_ID);

    if ('products' in result) {
      expect(result.products).toHaveLength(2);
    }
  });

  it('adds status filter when status is provided', async () => {
    const chain = buildChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(chain);

    await productQuery.getProductsByBusinessId(BUSINESS_ID, 'archived');

    expect(chain.eq).toHaveBeenCalledWith('status', 'archived');
  });
});
