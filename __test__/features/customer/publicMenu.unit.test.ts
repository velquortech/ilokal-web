/**
 * getPublicMenu — the mapper that feeds the public business profile's menu.
 *
 * It dropped `price_type`/`price_unit`, so a ₱500/hr service rendered as a
 * flat "₱500" on /explore (.claude/OFFERINGS_MODEL.md G1). These tests pin the
 * passthrough so the fields can't silently fall out of the projection again.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicMenu } from '@/lib/api/customer/customerQuery';
import { getProductsPaginated } from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ProductResponse } from '@/lib/types';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/api/products/productQuery', () => ({
  getProductsPaginated: vi.fn(),
}));

vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, _bucket: string, path: unknown) =>
      path == null ? null : `https://cdn.test/${String(path)}`,
  ),
}));

const BUSINESS_ID = '11111111-1111-1111-1111-111111111104';

function makeProduct(
  overrides: Partial<ProductResponse> = {},
): ProductResponse {
  return {
    id: 'cccccccc-0000-0000-0000-000000000001',
    business_id: BUSINESS_ID,
    branch_id: null,
    category_id: null,
    name: 'Hair Color Treatment',
    description: 'Full-length color',
    price: 500,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    price_type: 'per_hour',
    price_unit: null,
    image_url: 'shop/color.webp',
    status: 'active',
    is_available: true,
    archived_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockPaginated(products: ProductResponse[]) {
  vi.mocked(getProductsPaginated).mockResolvedValue({
    products,
    total: products.length,
    page: 1,
    per_page: 8,
    total_pages: 1,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(
    {} as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
  );
});

describe('getPublicMenu', () => {
  it('carries price_type and price_unit through to the client shape', async () => {
    mockPaginated([
      makeProduct({
        price_type: 'per_day',
        price_unit: 'per van',
        price: 3500,
      }),
    ]);

    const result = await getPublicMenu(BUSINESS_ID);

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.products[0]).toMatchObject({
      price: 3500,
      price_type: 'per_day',
      price_unit: 'per van',
    });
  });

  it('defaults a missing price_type to fixed rather than undefined', async () => {
    // Rows predating the column (or a partial projection) must still render.
    mockPaginated([
      makeProduct({
        price_type: undefined as unknown as ProductResponse['price_type'],
        price_unit: undefined as unknown as null,
      }),
    ]);

    const result = await getPublicMenu(BUSINESS_ID);

    if ('error' in result) throw new Error('expected products');
    expect(result.products[0].price_type).toBe('fixed');
    expect(result.products[0].price_unit).toBeNull();
  });

  it('still resolves storage paths and keeps the metadata envelope', async () => {
    mockPaginated([makeProduct()]);

    const result = await getPublicMenu(BUSINESS_ID);

    if ('error' in result) throw new Error('expected products');
    expect(result.products[0].image_url).toBe(
      'https://cdn.test/shop/color.webp',
    );
    expect(result.metadata).toEqual({
      total: 1,
      page: 1,
      per_page: 8,
      total_pages: 1,
    });
  });

  it('returns a generic error when the underlying query fails', async () => {
    vi.mocked(getProductsPaginated).mockResolvedValue({
      error: 'INTERNAL_ERROR',
    } as unknown as Awaited<ReturnType<typeof getProductsPaginated>>);

    const result = await getPublicMenu(BUSINESS_ID);

    expect(result).toEqual({ error: 'Failed to load the menu' });
  });
});
