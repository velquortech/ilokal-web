import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/products/route';
import * as searchService from '@/lib/api/search/searchService';
import { mockProduct, mockProductOnSale } from '../../mockData/products.mock';

vi.mock('@/lib/api/search/searchService');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockSearchResult = {
  success: true,
  data: {
    results: [
      {
        id: mockProduct.id,
        name: mockProduct.name,
        price: mockProduct.price,
        type: 'product',
      },
      {
        id: mockProductOnSale.id,
        name: mockProductOnSale.name,
        price: mockProductOnSale.price,
        type: 'product',
      },
    ],
    total: 2,
    page: 1,
    per_page: 20,
  },
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/search/products');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/search/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchService.searchProductsService).mockResolvedValue(
      mockSearchResult as unknown as Awaited<ReturnType<typeof searchService.searchProductsService>>,
    );
  });

  it('returns 200 with search results for a valid query', async () => {
    const res = await GET(makeRequest({ q: 'coffee' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 when query parameter is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when query parameter is an empty string', async () => {
    const res = await GET(makeRequest({ q: '   ' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts "query" as an alias for "q"', async () => {
    const res = await GET(makeRequest({ query: 'coffee' }));

    expect(res.status).toBe(200);
  });

  it('passes trimmed query to the search service', async () => {
    await GET(makeRequest({ q: '  flat white  ' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      'flat white',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes pagination params to the search service', async () => {
    await GET(makeRequest({ q: 'coffee', page: '2', per_page: '5' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ page: 2, per_page: 5 }),
      expect.anything(),
    );
  });

  it('caps per_page at 100', async () => {
    await GET(makeRequest({ q: 'coffee', per_page: '500' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ per_page: 100 }),
      expect.anything(),
    );
  });

  it('passes price range filters to the search service', async () => {
    await GET(makeRequest({ q: 'coffee', min_price: '50', max_price: '200' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ min_price: 50, max_price: 200 }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes category filter to the search service', async () => {
    await GET(makeRequest({ q: 'coffee', category: 'food-beverages' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ category: 'food-beverages' }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('passes sort_by to the search service', async () => {
    await GET(makeRequest({ q: 'coffee', sort_by: 'price_low' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      'price_low',
    );
  });

  it('returns 500 when the service throws', async () => {
    vi.mocked(searchService.searchProductsService).mockRejectedValueOnce(
      new Error('Search index down'),
    );

    const res = await GET(makeRequest({ q: 'coffee' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('includes Cache-Control header on successful response', async () => {
    const res = await GET(makeRequest({ q: 'coffee' }));

    expect(res.headers.get('Cache-Control')).toMatch(/max-age/);
  });

  it('page param defaults to 1 when not provided', async () => {
    await GET(makeRequest({ q: 'coffee' }));

    expect(vi.mocked(searchService.searchProductsService)).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ page: 1 }),
      expect.anything(),
    );
  });
});
