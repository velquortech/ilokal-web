import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as productQuery from '@/lib/api/products/productQuery';
import type { Category } from '@/lib/types';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food & Beverages',
    slug: 'food-beverages',
    description: 'Ready-to-eat food and drinks',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Clothing & Apparel',
    slug: 'clothing-apparel',
    description: 'Shirts, pants, and fashion',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/categories');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValue({
      categories: mockCategories,
      total: 2,
      page: 1,
      per_page: 10,
      total_pages: 1,
    });
  });

  it('returns 200 with default params', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.categories).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });

  it('passes validated params to getCategoriesPaginated', async () => {
    await GET(makeRequest({ page: '2', per_page: '5', sort_by: 'newest' }));
    expect(vi.mocked(productQuery.getCategoriesPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, per_page: 5, sort_by: 'newest' }),
    );
  });

  it('passes search param when provided', async () => {
    await GET(makeRequest({ search: 'food' }));
    expect(vi.mocked(productQuery.getCategoriesPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'food' }),
    );
  });

  it('returns 400 for an invalid sort_by value', async () => {
    const res = await GET(makeRequest({ sort_by: 'price_low' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts per_page up to 500 without a 400', async () => {
    const res = await GET(makeRequest({ per_page: '500' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when per_page exceeds 500', async () => {
    const res = await GET(makeRequest({ per_page: '501' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when the query throws', async () => {
    vi.mocked(productQuery.getCategoriesPaginated).mockRejectedValueOnce(
      new Error('DB connection failed'),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('response shape always includes success and data keys', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('categories');
    expect(body.data).toHaveProperty('total');
  });
});
