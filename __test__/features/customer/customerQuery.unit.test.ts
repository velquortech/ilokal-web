/**
 * customerQuery — directory/profile/coupons/wallet reads. Chain-mock style
 * mirrors productQuery.unit.test.ts. RLS behavior itself is enforced by the
 * DB; these tests pin the FILTERS the queries send (verified-only, published
 * coupon invariant, offset math) so a regression can't silently widen reads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBusinessDirectory,
  getPublicCoupons,
  getWalletRedemptions,
  getUpdatesFeed,
} from '@/lib/api/customer/customerQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function buildChain(overrides: Partial<Chain> = {}): Chain {
  const chain: Chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
    ...overrides,
  };
  return chain;
}

const rpcMock = vi.fn();
const storageMock = {
  from: vi.fn(() => ({
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://cdn.test/${path}` },
    })),
  })),
};

function mockSupabase(fromImpl: (table: string) => unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from: vi.fn(fromImpl),
    rpc: rpcMock,
    storage: storageMock,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ data: [], error: null });
});

describe('getBusinessDirectory', () => {
  it('reads only verified, non-archived businesses with offset pagination', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(() => chain);

    const result = await getBusinessDirectory({ page: 3, per_page: 12 });

    expect(chain.eq).toHaveBeenCalledWith('status', 'verified');
    expect(chain.is).toHaveBeenCalledWith('archived_at', null);
    expect(chain.is).toHaveBeenCalledWith('branches.archived_at', null);
    expect(chain.range).toHaveBeenCalledWith(24, 35);
    expect('businesses' in result && result.metadata.page).toBe(3);
  });

  it('applies search (shop_name ilike) and category filters', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(() => chain);

    await getBusinessDirectory({ search: 'cafe', category_id: 'cat-1' });

    expect(chain.ilike).toHaveBeenCalledWith('shop_name', '%cafe%');
    expect(chain.eq).toHaveBeenCalledWith('category_id', 'cat-1');
  });

  it('merges follower counts from the RPC and resolves storage paths', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({
      data: [
        {
          id: 'b1',
          shop_name: 'Test Cafe',
          description: null,
          logo_url: 'b1/logo.jpg',
          banner_url: null,
          business_categories: { name: 'Food' },
          branches: [{ id: 'br1', name: 'Main', address: 'Iznart St' }],
        },
      ],
      count: 1,
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: [{ business_id: 'b1', follower_count: 7 }],
      error: null,
    });
    mockSupabase(() => chain);

    const result = await getBusinessDirectory({});

    expect(rpcMock).toHaveBeenCalledWith('get_follower_counts', {
      p_business_ids: ['b1'],
    });
    if ('businesses' in result) {
      expect(result.businesses[0].follower_count).toBe(7);
      expect(result.businesses[0].logo_url).toBe(
        'https://cdn.test/b1/logo.jpg',
      );
      expect(result.businesses[0].category_name).toBe('Food');
    } else {
      throw new Error('expected businesses');
    }
  });

  it('returns a generic error when the read fails', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'relation businesses broke' },
    });
    mockSupabase(() => chain);

    const result = await getBusinessDirectory({});
    expect(result).toEqual({ error: 'Failed to load businesses' });
  });
});

describe('getPublicCoupons', () => {
  it('enforces the coupon access invariant (published + not archived + started + not expired)', async () => {
    const chain = buildChain();
    chain.order.mockResolvedValue({ data: [], error: null });
    mockSupabase(() => chain);

    await getPublicCoupons('b1');

    expect(chain.eq).toHaveBeenCalledWith('status', 'published');
    expect(chain.is).toHaveBeenCalledWith('archived_at', null);
    expect(chain.lte).toHaveBeenCalledWith('start_date', expect.any(String));
    expect(chain.gte).toHaveBeenCalledWith('expiry_date', expect.any(String));
  });
});

describe('getWalletRedemptions', () => {
  it('scopes to the user; active filter counts NULL expires_at as active (mobile parity)', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(() => chain);

    await getWalletRedemptions('user-1', 'active');

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('is_claimed', false);
    expect(chain.or).toHaveBeenCalledWith(
      expect.stringMatching(/^expires_at\.is\.null,expires_at\.gt\./),
    );
  });

  it('expired filter = unclaimed with a real, past expires_at', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({ data: [], count: 0, error: null });
    mockSupabase(() => chain);

    await getWalletRedemptions('user-1', 'expired');

    expect(chain.eq).toHaveBeenCalledWith('is_claimed', false);
    expect(chain.not).toHaveBeenCalledWith('expires_at', 'is', null);
    expect(chain.lt).toHaveBeenCalledWith('expires_at', expect.any(String));
  });

  it('pages with .range() and returns exact-count metadata', async () => {
    const chain = buildChain();
    chain.range.mockResolvedValue({ data: [], count: 30, error: null });
    mockSupabase(() => chain);

    const result = await getWalletRedemptions('user-1', 'claimed', 2);

    expect(chain.range).toHaveBeenCalledWith(12, 23);
    if ('metadata' in result) {
      expect(result.metadata).toEqual({
        total: 30,
        page: 2,
        per_page: 12,
        total_pages: 3,
      });
    } else {
      throw new Error('expected metadata');
    }
  });
});

describe('getUpdatesFeed', () => {
  it('short-circuits to empty when the user follows nobody', async () => {
    const followsChain = buildChain();
    followsChain.eq = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabase(() => followsChain);

    const result = await getUpdatesFeed('user-1');

    expect(result).toEqual({
      updates: [],
      page: 1,
      per_page: 10,
      has_more: false,
    });
  });
});
