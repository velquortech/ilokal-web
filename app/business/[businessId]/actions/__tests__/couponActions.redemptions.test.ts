import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ApiResponse,
  PaginatedRedemptionRecordsResponse,
  RedemptionSummaryStats,
} from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as couponQuery from '@/lib/api/coupons/couponQuery';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/coupons/couponQuery');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/services/couponService', () => ({
  default: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    redeem: vi.fn(),
    createFeaturedDeal: vi.fn(),
    updateFeaturedDeal: vi.fn(),
    deleteFeaturedDeal: vi.fn(),
  },
}));

import {
  getRedeemedCouponsAction,
  getRedemptionSummaryStatsAction,
} from '../couponActions';

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  user: { id: 'user-1' },
};
const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

function mockAuthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    authorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}
function mockUnauthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    unauthorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}

const emptyPaginatedResult: PaginatedRedemptionRecordsResponse = {
  redemptions: [],
  total: 0,
  page: 1,
  per_page: 10,
  total_pages: 0,
};

const defaultStats: RedemptionSummaryStats = {
  total: 5,
  unique_users: 3,
  active: 2,
  claimed: 3,
};

describe('getRedeemedCouponsAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with paginated data when authorized', async () => {
    mockAuthorized();
    vi.mocked(couponQuery.getRedeemedCouponsPaginated).mockResolvedValue(
      emptyPaginatedResult,
    );

    const result: ApiResponse<PaginatedRedemptionRecordsResponse> =
      await getRedeemedCouponsAction({ page: 1, per_page: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(emptyPaginatedResult);
  });

  it('calls getRedeemedCouponsPaginated with correct businessId and filters', async () => {
    mockAuthorized();
    vi.mocked(couponQuery.getRedeemedCouponsPaginated).mockResolvedValue(
      emptyPaginatedResult,
    );

    await getRedeemedCouponsAction({
      page: 2,
      per_page: 20,
      status: 'active',
    });

    expect(couponQuery.getRedeemedCouponsPaginated).toHaveBeenCalledWith(
      BUSINESS_ID,
      { page: 2, per_page: 20, status: 'active' },
    );
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const result = await getRedeemedCouponsAction({ page: 1, per_page: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(couponQuery.getRedeemedCouponsPaginated).not.toHaveBeenCalled();
  });

  it('returns INTERNAL_ERROR when query function returns an error string', async () => {
    mockAuthorized();
    vi.mocked(couponQuery.getRedeemedCouponsPaginated).mockResolvedValue({
      redemptions: [],
      total: 0,
      error: 'Failed to fetch redemptions',
    });

    const result = await getRedeemedCouponsAction({ page: 1, per_page: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INTERNAL_ERROR');
  });

  it('returns INTERNAL_ERROR when the query throws', async () => {
    mockAuthorized();
    vi.mocked(couponQuery.getRedeemedCouponsPaginated).mockRejectedValue(
      new Error('unexpected'),
    );

    const result = await getRedeemedCouponsAction({ page: 1, per_page: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INTERNAL_ERROR');
  });
});

describe('getRedemptionSummaryStatsAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with stats when authorized', async () => {
    mockAuthorized();
    vi.mocked(
      couponQuery.getRedemptionSummaryStatsByBusiness,
    ).mockResolvedValue(defaultStats);

    const result: ApiResponse<RedemptionSummaryStats> =
      await getRedemptionSummaryStatsAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(defaultStats);
  });

  it('passes branchId to the query function when provided', async () => {
    mockAuthorized();
    vi.mocked(
      couponQuery.getRedemptionSummaryStatsByBusiness,
    ).mockResolvedValue(defaultStats);

    await getRedemptionSummaryStatsAction('branch-abc');

    expect(
      couponQuery.getRedemptionSummaryStatsByBusiness,
    ).toHaveBeenCalledWith(BUSINESS_ID, 'branch-abc');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const result = await getRedemptionSummaryStatsAction();

    expect(result.success).toBe(false);
    expect(
      couponQuery.getRedemptionSummaryStatsByBusiness,
    ).not.toHaveBeenCalled();
  });

  it('returns INTERNAL_ERROR when the query throws', async () => {
    mockAuthorized();
    vi.mocked(
      couponQuery.getRedemptionSummaryStatsByBusiness,
    ).mockRejectedValue(new Error('unexpected'));

    const result = await getRedemptionSummaryStatsAction();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INTERNAL_ERROR');
  });
});
