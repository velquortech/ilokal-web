import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/products/route';
import * as productQuery from '@/lib/api/products/productQuery';
import type { PaginatedProductsResponse } from '@/lib/types';
import { paginatedProductsResponse } from '../../mockData/products.mock';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/products');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productQuery.getProductsPaginated).mockResolvedValue(
      paginatedProductsResponse,
    );
  });

  it('returns 200 with paginated products on default params', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.products).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });

  it('passes page and per_page to the query layer', async () => {
    await GET(makeRequest({ page: '2', per_page: '5' }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, per_page: 5 }),
    );
  });

  it('passes search term to the query layer', async () => {
    await GET(makeRequest({ search: 'flat white' }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'flat white' }),
    );
  });

  it('passes category_id filter to the query layer', async () => {
    const catId = '550e8400-e29b-41d4-a716-446655440000';
    await GET(makeRequest({ category_id: catId }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: catId }),
    );
  });

  it('passes business_id filter to the query layer', async () => {
    const bizId = '660e8400-e29b-41d4-a716-446655440001';
    await GET(makeRequest({ business_id: bizId }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: bizId }),
    );
  });

  it('passes min_price and max_price to the query layer', async () => {
    await GET(makeRequest({ min_price: '50', max_price: '200' }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ min_price: 50, max_price: 200 }),
    );
  });

  it.each([['newest'], ['oldest'], ['name_asc'], ['name_desc'], ['price_low'], ['price_high']] as const)(
    'accepts sort_by="%s"',
    async (sort_by) => {
      const res = await GET(makeRequest({ sort_by }));
      expect(res.status).toBe(200);
    },
  );

  it('returns 400 for an invalid sort_by value', async () => {
    const res = await GET(makeRequest({ sort_by: 'invalid_sort' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for a negative page number', async () => {
    const res = await GET(makeRequest({ page: '-1' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when query returns an error', async () => {
    vi.mocked(productQuery.getProductsPaginated).mockResolvedValueOnce({
      error: 'Database connection lost',
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 when query throws an exception', async () => {
    vi.mocked(productQuery.getProductsPaginated).mockRejectedValueOnce(
      new Error('Unexpected crash'),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('response shape includes required pagination fields', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    const data = body.data as PaginatedProductsResponse;
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('per_page');
    expect(data).toHaveProperty('total_pages');
  });

  it('includes Cache-Control header on success', async () => {
    const res = await GET(makeRequest());

    expect(res.headers.get('Cache-Control')).toMatch(/max-age/);
  });

  it('defaults status filter to "active"', async () => {
    await GET(makeRequest());

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('passes explicit status filter when provided', async () => {
    await GET(makeRequest({ status: 'inactive' }));

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'inactive' }),
    );
  });

  it('returns products with all expected fields', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    const firstProduct = body.data.products[0];

    expect(firstProduct).toHaveProperty('id');
    expect(firstProduct).toHaveProperty('name');
    expect(firstProduct).toHaveProperty('price');
    expect(firstProduct).toHaveProperty('status');
  });
});
