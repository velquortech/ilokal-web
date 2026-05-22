import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/analytics/products/route';
import * as assertAuthorizedModule from '@/lib/utils/assertAuthorized';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import * as service from '@/lib/api/analytics/businessAnalyticsService';
import { BUSINESS_ID } from '../../mockData/products.mock';

vi.mock('@/lib/utils/assertAuthorized');
vi.mock('@/lib/api/subscriptions/subscriptionQuery');
vi.mock('@/lib/api/analytics/businessAnalyticsService');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';

const mockProductPerformance = {
  success: true,
  data: [
    { product_id: 'prod-1', name: 'Flat White', views: 120, sales: 35 },
    { product_id: 'prod-2', name: 'Cappuccino', views: 85, sales: 20 },
  ],
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/analytics/products');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

function mockAuthorized() {
  vi.mocked(assertAuthorizedModule.assertAuthorized).mockResolvedValue({
    authorized: true,
    user: { id: USER_ID },
  } as unknown as Awaited<ReturnType<typeof assertAuthorizedModule.assertAuthorized>>);
}

function mockUnauthorized() {
  const errorResponse = new Response(
    JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authorized' } }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
  vi.mocked(assertAuthorizedModule.assertAuthorized).mockResolvedValue({
    authorized: false,
    error: errorResponse,
  } as unknown as Awaited<ReturnType<typeof assertAuthorizedModule.assertAuthorized>>);
}

describe('GET /api/analytics/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
    vi.mocked(subscriptionQuery.getUserBusiness).mockResolvedValue({
      data: { id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof subscriptionQuery.getUserBusiness>>);
    vi.mocked(service.getProductPerformance).mockResolvedValue(
      mockProductPerformance as unknown as Awaited<ReturnType<typeof service.getProductPerformance>>,
    );
  });

  it('returns 200 with product performance data', async () => {
    const res = await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockUnauthorized();

    const res = await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(res.status).toBe(401);
  });

  it('returns 400 when business_id is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when user does not own the business', async () => {
    vi.mocked(subscriptionQuery.getUserBusiness).mockResolvedValue({
      data: { id: 'other-business-id' },
    } as unknown as Awaited<ReturnType<typeof subscriptionQuery.getUserBusiness>>);

    const res = await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 403 when getUserBusiness returns an error', async () => {
    vi.mocked(subscriptionQuery.getUserBusiness).mockResolvedValue({
      error: 'Business not found',
    } as unknown as Awaited<ReturnType<typeof subscriptionQuery.getUserBusiness>>);

    const res = await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(res.status).toBe(403);
  });

  it('passes the limit param to getProductPerformance', async () => {
    await GET(makeRequest({ business_id: BUSINESS_ID, limit: '5' }));

    expect(vi.mocked(service.getProductPerformance)).toHaveBeenCalledWith(
      BUSINESS_ID,
      5,
    );
  });

  it('defaults limit to 10 when not provided', async () => {
    await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(vi.mocked(service.getProductPerformance)).toHaveBeenCalledWith(
      BUSINESS_ID,
      10,
    );
  });

  it('returns 500 when service throws an exception', async () => {
    vi.mocked(service.getProductPerformance).mockRejectedValueOnce(
      new Error('Analytics engine down'),
    );

    const res = await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('passes business_id to getProductPerformance', async () => {
    await GET(makeRequest({ business_id: BUSINESS_ID }));

    expect(vi.mocked(service.getProductPerformance)).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.any(Number),
    );
  });
});
