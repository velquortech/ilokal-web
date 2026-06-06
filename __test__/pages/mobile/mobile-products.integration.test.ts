import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/mobile/businesses/[businessId]/products/route';
import { createBearerClient } from '@/supabase/bearer';
import { mockMobileProduct, BUSINESS_ID } from '../../mockData/products.mock';

vi.mock('@/supabase/bearer');

type RpcChain = {
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
};

function buildRpcChain(overrides: Partial<RpcChain> = {}): RpcChain {
  const chain: RpcChain = {
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
    ...overrides,
  };
  return chain;
}

function mockBearerClient(chain: RpcChain) {
  vi.mocked(createBearerClient).mockReturnValue({
    rpc: vi.fn().mockReturnValue(chain),
  } as unknown as ReturnType<typeof createBearerClient>);
}

function makeRequest(businessId: string) {
  const url = new URL(
    `http://localhost:3000/api/mobile/businesses/${businessId}/products`,
  );
  return {
    req: new NextRequest(url),
    params: Promise.resolve({ businessId }),
  };
}

const rawDbProduct = {
  id: mockMobileProduct.id,
  name: mockMobileProduct.name,
  description: mockMobileProduct.description,
  price: mockMobileProduct.price,
  price_type: mockMobileProduct.price_type,
  price_unit: mockMobileProduct.price_unit,
  image_url: mockMobileProduct.image_url,
  is_available: mockMobileProduct.is_available,
  average_rating: 4.5,
  rating_count: 2,
};

describe('GET /api/mobile/businesses/:businessId/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with available products for a business', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
  });

  it('calls rpc with the correct business_id', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null, count: null });
    const rpcFn = vi.fn().mockReturnValue(chain);
    vi.mocked(createBearerClient).mockReturnValue({
      rpc: rpcFn,
    } as unknown as ReturnType<typeof createBearerClient>);

    const { req, params } = makeRequest(BUSINESS_ID);
    await GET(req, { params });

    expect(rpcFn).toHaveBeenCalledWith(
      'business_products',
      { p_business_id: BUSINESS_ID },
      expect.any(Object),
    );
  });

  it('orders results by name for non-paginated requests', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null, count: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    await GET(req, { params });

    expect(chain.order).toHaveBeenCalledWith('name', expect.objectContaining({ ascending: true }));
  });

  it('computes average_rating and rating_count from rpc response', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    const product = body.products[0];
    expect(product.average_rating).toBe(4.5);
    expect(product.rating_count).toBe(2);
  });

  it('returns average_rating=0 and rating_count=0 when product has no ratings', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [{ ...rawDbProduct, average_rating: null, rating_count: null }],
      error: null,
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    const product = body.products[0];
    expect(product.average_rating).toBe(0);
    expect(product.rating_count).toBe(0);
  });

  it('returns empty products array when business has no available products', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null, count: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.products).toHaveLength(0);
  });

  it('returns error response on DB failure', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });

    expect(res.status).not.toBe(200);
  });

  it('product response shape includes all expected fields', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();
    const product = body.products[0];

    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('is_available');
    expect(product).toHaveProperty('average_rating');
    expect(product).toHaveProperty('rating_count');
  });

  it('returns 500 on unexpected exception', async () => {
    vi.mocked(createBearerClient).mockImplementationOnce(() => {
      throw new Error('bearer client failed');
    });

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });

    expect(res.status).toBe(500);
  });

  it('passes through average_rating rounded to 1 decimal place', async () => {
    const chain = buildRpcChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [{ ...rawDbProduct, average_rating: 4.0, rating_count: 3 }],
      error: null,
      count: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.products[0].average_rating).toBe(4.0);
  });
});
