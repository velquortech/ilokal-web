/**
 * SEC-4 — rating routes surface the redeem-first RLS gate as a 403.
 * The RESTRICTIVE policies (20260717080351) reject an INSERT with SQLSTATE
 * 42501 when the user has never redeemed from the business; the routes must
 * map that to a friendly 403 instead of a logged 500.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postBusinessRating } from '../businesses/[businessId]/route';
import { POST as postProductRating } from '../products/[productId]/route';
import { getMobileUser } from '@/app/api/helpers/mobile-request';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

const USER_ID = '11111111-2222-3333-4444-555555555555';
const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const PRODUCT_ID = 'cccccccc-0000-0000-0000-000000000001';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/protected/mobile/ratings', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeSupabase(upsertResult: {
  data: unknown;
  error: { code: string; message: string } | null;
}) {
  const single = vi.fn();
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single,
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(upsertResult),
      }),
    }),
  };
  // First .single() resolves the existence check (business/product lookup)
  single.mockResolvedValue({
    data: { id: BUSINESS_ID, business_id: BUSINESS_ID },
    error: null,
  });
  return { from: vi.fn().mockReturnValue(chain) };
}

describe('SEC-4 rating interaction gate (route mapping)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the RLS denial (42501) to 403 on business ratings', async () => {
    (getMobileUser as Mock).mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeSupabase({
        data: null,
        error: { code: '42501', message: 'rls' },
      }),
    });

    const res = await postBusinessRating(makeRequest({ rating: 5 }), {
      params: Promise.resolve({ businessId: BUSINESS_ID }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('redeemed');
  });

  it('maps the RLS denial (42501) to 403 on product ratings', async () => {
    (getMobileUser as Mock).mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeSupabase({
        data: null,
        error: { code: '42501', message: 'rls' },
      }),
    });

    const res = await postProductRating(makeRequest({ rating: 4 }), {
      params: Promise.resolve({ productId: PRODUCT_ID }),
    });
    expect(res.status).toBe(403);
  });

  it('still succeeds when the upsert passes', async () => {
    (getMobileUser as Mock).mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeSupabase({
        data: { id: 'r1', rating: 5 },
        error: null,
      }),
    });

    const res = await postBusinessRating(makeRequest({ rating: 5 }), {
      params: Promise.resolve({ businessId: BUSINESS_ID }),
    });
    expect(res.status).toBe(200);
  });

  it('non-RLS DB errors still map to a generic 500', async () => {
    (getMobileUser as Mock).mockResolvedValue({
      user: { id: USER_ID },
      supabase: makeSupabase({
        data: null,
        error: { code: 'XX000', message: 'boom' },
      }),
    });

    const res = await postBusinessRating(makeRequest({ rating: 5 }), {
      params: Promise.resolve({ businessId: BUSINESS_ID }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('boom');
  });
});
