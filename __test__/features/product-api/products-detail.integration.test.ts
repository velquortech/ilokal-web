import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/products/[id]/route';
import * as productQuery from '@/lib/api/products/productQuery';
import { mockProductResponse, mockProduct } from '../../mockData/products.mock';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function makeRequest(id: string) {
  const url = new URL(`http://localhost:3000/api/products/${id}`);
  return {
    req: new NextRequest(url),
    params: Promise.resolve({ id }),
  };
}

describe('GET /api/products/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productQuery.getProductById).mockResolvedValue({
      product: mockProductResponse,
    });
  });

  it('returns 200 with product data for a valid id', async () => {
    const { req, params } = makeRequest(mockProduct.id);

    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(mockProduct.id);
    expect(body.data.name).toBe(mockProduct.name);
  });

  it('returns 404 when product does not exist', async () => {
    vi.mocked(productQuery.getProductById).mockResolvedValueOnce({
      error: 'Product not found',
    });
    const { req, params } = makeRequest('nonexistent-id');

    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('includes Cache-Control header on a successful response', async () => {
    const { req, params } = makeRequest(mockProduct.id);

    const res = await GET(req, { params });

    expect(res.headers.get('Cache-Control')).toMatch(/max-age/);
  });

  it('returns 500 when the query throws an exception', async () => {
    vi.mocked(productQuery.getProductById).mockRejectedValueOnce(
      new Error('DB failure'),
    );
    const { req, params } = makeRequest(mockProduct.id);

    const res = await GET(req, { params });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('response shape includes success and data fields', async () => {
    const { req, params } = makeRequest(mockProduct.id);

    const res = await GET(req, { params });
    const body = await res.json();

    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('price');
    expect(body.data).toHaveProperty('status');
  });

  it('returns product with category join data when present', async () => {
    const { req, params } = makeRequest(mockProduct.id);

    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.data.category).toBeDefined();
    expect(body.data.category.slug).toBe('food-beverages');
  });

  it('calls getProductById with the correct id', async () => {
    const { req, params } = makeRequest(mockProduct.id);

    await GET(req, { params });

    expect(vi.mocked(productQuery.getProductById)).toHaveBeenCalledWith(
      mockProduct.id,
    );
  });

  it('returns error message from query in NOT_FOUND response', async () => {
    vi.mocked(productQuery.getProductById).mockResolvedValueOnce({
      error: 'Product not found',
    });
    const { req, params } = makeRequest('some-id');

    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.error.message).toBe('Product not found');
  });
});
