import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/mobile/businesses/[businessId]/products/route';
import { createBearerClient } from '@/supabase/bearer';
import { mockMobileProduct, BUSINESS_ID } from '../../mockData/products.mock';

vi.mock('@/supabase/bearer');

type BearerChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

function buildBearerChain(overrides: Partial<BearerChain> = {}): BearerChain {
  const chain: BearerChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn(),
    ...overrides,
  };
  return chain;
}

function mockBearerClient(chain: BearerChain) {
  vi.mocked(createBearerClient).mockReturnValue({
    from: vi.fn(() => chain),
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
  ratings: [{ rating: 4 }, { rating: 5 }],
};

describe('GET /api/mobile/businesses/:businessId/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with available products for a business', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
  });

  it('filters by is_available=true', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    await GET(req, { params });

    expect(chain.eq).toHaveBeenCalledWith('is_available', true);
  });

  it('filters by business_id', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    await GET(req, { params });

    expect(chain.eq).toHaveBeenCalledWith('business_id', BUSINESS_ID);
  });

  it('excludes archived products (is null archived_at)', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    await GET(req, { params });

    expect(chain.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('computes average_rating and rating_count from ratings', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
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
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [{ ...rawDbProduct, ratings: [] }],
      error: null,
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
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.products).toHaveLength(0);
  });

  it('returns error response on DB failure', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });

    expect(res.status).not.toBe(200);
  });

  it('product response shape includes all expected fields', async () => {
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [rawDbProduct],
      error: null,
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

  it('rounds average_rating to 1 decimal place', async () => {
    const productWithThreeRatings = {
      ...rawDbProduct,
      ratings: [{ rating: 4 }, { rating: 3 }, { rating: 5 }],
    };
    const chain = buildBearerChain();
    chain.order = vi.fn().mockResolvedValue({
      data: [productWithThreeRatings],
      error: null,
    });
    mockBearerClient(chain);

    const { req, params } = makeRequest(BUSINESS_ID);
    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.products[0].average_rating).toBe(4.0);
  });
});
