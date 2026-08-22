import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@/supabase/bearer', () => ({
  createBearerClient: vi.fn(),
}));

import { createBearerClient } from '@/supabase/bearer';

const BUSINESS_ID = '2f9c1d8a-0000-4000-8000-000000000001';

function makeRequest(businessId = BUSINESS_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/mobile/businesses/${businessId}/coupons`,
  );
}

function makeParams(businessId = BUSINESS_ID) {
  return { params: Promise.resolve({ businessId }) };
}

function makeSupabaseChain(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
  const order = vi.fn().mockResolvedValue(result);
  const gte = vi.fn(() => ({ order }));
  const lte = vi.fn(() => ({ gte }));
  const is = vi.fn(() => ({ lte }));
  const eq2 = vi.fn(() => ({ is }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq1, eq2, is, lte, gte, order };
}

describe('GET /api/mobile/businesses/[businessId]/coupons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 🔴 The mobile client requested `/businesses/bida-ngayon/coupons` — a slug.
   * Unvalidated, that reached PostgREST as a `uuid` and Postgres raised
   * `22P02`, so the route answered 500 and reported it to Sentry
   * (JAVASCRIPT-NEXTJS-F). "No such shop" is a 404, and Postgres should never
   * be asked the question.
   */
  it('404s a non-uuid id without touching the database', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    const res = await GET(
      makeRequest('bida-ngayon'),
      makeParams('bida-ngayon'),
    );

    expect(res.status).toBe(404);
    expect(chain.from).not.toHaveBeenCalled();
  });

  it('returns only published and currently active coupons', async () => {
    const mockCoupons = [
      {
        id: 'cou-1',
        code: 'SUMMER10',
        description: '10% off',
        discount: { type: 'percentage', value: 10 },
        usage_scope: 'any',
        start_date: new Date(Date.now() - 86400000).toISOString(),
        expiry_date: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    const chain = makeSupabaseChain({ data: mockCoupons, error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.coupons).toHaveLength(1);
    expect(body.coupons[0].code).toBe('SUMMER10');
  });

  it('filters by status = published', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    await GET(makeRequest(), makeParams());

    expect(chain.eq2).toHaveBeenCalledWith('status', 'published');
  });

  it('filters by start_date <= now (excludes upcoming coupons)', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    await GET(makeRequest(), makeParams());

    expect(chain.lte).toHaveBeenCalledWith('start_date', expect.any(String));
  });

  it('filters by expiry_date >= now (excludes expired coupons)', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    await GET(makeRequest(), makeParams());

    expect(chain.gte).toHaveBeenCalledWith('expiry_date', expect.any(String));
  });

  it('filters out archived coupons', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    await GET(makeRequest(), makeParams());

    expect(chain.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('returns empty array when no active coupons exist', async () => {
    const chain = makeSupabaseChain({ data: [], error: null });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    const res = await GET(makeRequest(), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.coupons).toHaveLength(0);
  });

  it('returns 500 when database query fails', async () => {
    const chain = makeSupabaseChain({
      data: null,
      error: { message: 'DB error' },
    });
    vi.mocked(createBearerClient).mockReturnValue({
      from: chain.from,
    } as unknown as ReturnType<typeof createBearerClient>);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(500);
  });
});
