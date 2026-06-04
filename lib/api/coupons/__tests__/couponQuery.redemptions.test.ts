import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as couponQuery from '@/lib/api/coupons/couponQuery';
import * as supabaseServer from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createAnalyticsSupabaseClient: vi.fn(),
}));

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';

const mockCouponIds = [
  { id: 'coupon-00000000-0000-0000-0000-000000000001' },
  { id: 'coupon-00000000-0000-0000-0000-000000000002' },
];

const baseRedemption = {
  id: 'redemption-1',
  coupon_id: 'coupon-00000000-0000-0000-0000-000000000001',
  user_id: 'user-1',
  branch_id: 'branch-1',
  redeemed_at: '2026-01-01T10:00:00Z',
  expires_at: '2026-12-31T23:59:59Z',
  is_claimed: false,
  coupons: {
    code: 'SAVE20',
    discount: { type: 'percentage', value: 20 },
    usage_scope: 'any',
    expiry_date: '2026-12-31T23:59:59Z',
    description: 'Save 20% on any item',
  },
  profiles: {
    full_name: 'Juan dela Cruz',
    email: 'juan@example.com',
    avatar_url: null,
  },
  branches: { name: 'Main Branch', address: 'Iloilo City' },
};

function makeCouponChain(resolvedData: {
  data: { id: string }[] | null;
  error: null;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    // Makes `await chain` work regardless of which method is last in the chain
    then: (
      resolve: (value: typeof resolvedData) => unknown,
      _reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolvedData).then(resolve, _reject),
  };
  return chain;
}

function makeRedemptionChain(resolvedData: {
  data: (typeof baseRedemption)[] | null;
  count: number | null;
  error: null | { message: string };
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(resolvedData),
  };
  return chain;
}

function makeStatsRedemptionChain(resolvedData: {
  data:
    | { user_id: string; is_claimed: boolean; expires_at: string | null }[]
    | null;
  error: null | { message: string };
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (
      resolve: (value: typeof resolvedData) => unknown,
      _reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolvedData).then(resolve, _reject),
  };
  return chain;
}

describe('getRedeemedCouponsPaginated()', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(
    couponResult: { data: { id: string }[] | null; error: null },
    redemptionResult: {
      data: (typeof baseRedemption)[] | null;
      count: number | null;
      error: null | { message: string };
    },
  ) {
    const couponChain = makeCouponChain(couponResult);
    const redemptionChain = makeRedemptionChain(redemptionResult);

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return couponChain;
        return redemptionChain;
      }),
    };

    vi.mocked(supabaseServer.createAnalyticsSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createAnalyticsSupabaseClient>
      >,
    );

    return { couponChain, redemptionChain };
  }

  it('returns paginated list when business has coupons with redemptions', async () => {
    setupMocks(
      { data: mockCouponIds, error: null },
      { data: [baseRedemption], count: 1, error: null },
    );

    const result = await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
    });

    expect(result.redemptions).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.total_pages).toBe(1);
  });

  it('returns empty list when business has no coupons', async () => {
    setupMocks({ data: [], error: null }, { data: [], count: 0, error: null });

    const result = await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
    });

    expect(result.redemptions).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.total_pages).toBe(0);
  });

  it('applies ilike search on coupon code when search is provided', async () => {
    const { couponChain } = setupMocks(
      { data: [mockCouponIds[0]], error: null },
      { data: [], count: 0, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      search: 'SAVE',
    });

    expect(couponChain.ilike).toHaveBeenCalledWith('code', '%SAVE%');
  });

  it('filters by claimed status', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      {
        data: [{ ...baseRedemption, is_claimed: true }],
        count: 1,
        error: null,
      },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      status: 'claimed',
    });

    expect(redemptionChain.eq).toHaveBeenCalledWith('is_claimed', true);
  });

  it('filters by active status using eq and or', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [baseRedemption], count: 1, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      status: 'active',
    });

    expect(redemptionChain.eq).toHaveBeenCalledWith('is_claimed', false);
    expect(redemptionChain.or).toHaveBeenCalled();
  });

  it('filters by expired status using eq, not, and lt', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [], count: 0, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      status: 'expired',
    });

    expect(redemptionChain.eq).toHaveBeenCalledWith('is_claimed', false);
    expect(redemptionChain.not).toHaveBeenCalledWith('expires_at', 'is', null);
    expect(redemptionChain.lt).toHaveBeenCalled();
  });

  it('filters by branch_id when provided', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [baseRedemption], count: 1, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      branch_id: 'branch-1',
    });

    expect(redemptionChain.eq).toHaveBeenCalledWith('branch_id', 'branch-1');
  });

  it('applies correct offset for page 2', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [], count: 25, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 2,
      per_page: 10,
    });

    expect(redemptionChain.range).toHaveBeenCalledWith(10, 19);
  });

  it('orders by redeemed_at descending (newest) by default', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [], count: 0, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
    });

    expect(redemptionChain.order).toHaveBeenCalledWith('redeemed_at', {
      ascending: false,
    });
  });

  it('orders by redeemed_at ascending when sort_by is oldest', async () => {
    const { redemptionChain } = setupMocks(
      { data: mockCouponIds, error: null },
      { data: [], count: 0, error: null },
    );

    await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
      sort_by: 'oldest',
    });

    expect(redemptionChain.order).toHaveBeenCalledWith('redeemed_at', {
      ascending: true,
    });
  });

  it('returns error when redemption query fails', async () => {
    const couponChain = makeCouponChain({ data: mockCouponIds, error: null });
    const redemptionChain = makeRedemptionChain({
      data: null,
      count: null,
      error: { message: 'DB error' },
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return couponChain;
        return redemptionChain;
      }),
    };

    vi.mocked(supabaseServer.createAnalyticsSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createAnalyticsSupabaseClient>
      >,
    );

    const result = await couponQuery.getRedeemedCouponsPaginated(BUSINESS_ID, {
      page: 1,
      per_page: 10,
    });

    expect(result.redemptions).toHaveLength(0);
    expect('error' in result).toBe(true);
  });
});

describe('getRedemptionSummaryStatsByBusiness()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupStatsMocks(
    couponData: { id: string }[] | null,
    redemptionData:
      | { user_id: string; is_claimed: boolean; expires_at: string | null }[]
      | null,
  ) {
    const couponData2 = couponData;
    const couponChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      then: (
        resolve: (value: { data: typeof couponData2; error: null }) => unknown,
        _reject?: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({ data: couponData2, error: null }).then(
          resolve,
          _reject,
        ),
    };

    const redemptionChain = makeStatsRedemptionChain({
      data: redemptionData,
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'coupons') return couponChain;
        return redemptionChain;
      }),
    };

    vi.mocked(supabaseServer.createAnalyticsSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createAnalyticsSupabaseClient>
      >,
    );
  }

  it('returns zeroes when business has no coupons', async () => {
    setupStatsMocks([], []);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats).toEqual({ total: 0, unique_users: 0, active: 0, claimed: 0 });
  });

  it('returns correct total count', async () => {
    setupStatsMocks(mockCouponIds, [
      { user_id: 'u1', is_claimed: false, expires_at: '2099-01-01T00:00:00Z' },
      { user_id: 'u2', is_claimed: false, expires_at: '2099-01-01T00:00:00Z' },
      { user_id: 'u3', is_claimed: true, expires_at: '2099-01-01T00:00:00Z' },
    ]);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats.total).toBe(3);
  });

  it('counts unique users correctly across multiple redemptions', async () => {
    setupStatsMocks(mockCouponIds, [
      { user_id: 'u1', is_claimed: false, expires_at: '2099-01-01T00:00:00Z' },
      { user_id: 'u1', is_claimed: false, expires_at: '2099-01-01T00:00:00Z' },
      { user_id: 'u2', is_claimed: true, expires_at: '2099-01-01T00:00:00Z' },
    ]);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats.unique_users).toBe(2);
  });

  it('counts claimed redemptions correctly', async () => {
    setupStatsMocks(mockCouponIds, [
      { user_id: 'u1', is_claimed: true, expires_at: null },
      { user_id: 'u2', is_claimed: true, expires_at: null },
      { user_id: 'u3', is_claimed: false, expires_at: '2099-01-01T00:00:00Z' },
    ]);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats.claimed).toBe(2);
  });

  it('counts active redemptions (not claimed, not expired)', async () => {
    const future = '2099-01-01T00:00:00Z';
    const past = '2020-01-01T00:00:00Z';

    setupStatsMocks(mockCouponIds, [
      { user_id: 'u1', is_claimed: false, expires_at: future },
      { user_id: 'u2', is_claimed: false, expires_at: null }, // no expiry → active
      { user_id: 'u3', is_claimed: false, expires_at: past }, // expired
      { user_id: 'u4', is_claimed: true, expires_at: future }, // claimed
    ]);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats.active).toBe(2);
  });

  it('returns zeroes when redemptions query returns null', async () => {
    setupStatsMocks(mockCouponIds, null);

    const stats =
      await couponQuery.getRedemptionSummaryStatsByBusiness(BUSINESS_ID);

    expect(stats).toEqual({ total: 0, unique_users: 0, active: 0, claimed: 0 });
  });
});
