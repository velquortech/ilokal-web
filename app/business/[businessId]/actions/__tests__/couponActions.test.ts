import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ApiResponse,
  Coupon,
  PaginatedCouponsResponse,
} from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as couponQuery from '@/lib/api/coupons/couponQuery';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/coupons/couponQuery');
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
  getBusinessCouponsPaginatedAction,
  getBusinessCouponStatsAction,
  createCouponAction,
  updateCouponAction,
  deleteCouponAction,
} from '../couponActions';

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const COUPON_ID = 'cou-00000000-0000-0000-0000-000000000001';

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

const baseValidInput = {
  code: 'TEST10',
  discount: { type: 'percentage' as const, value: 10 },
  usage_scope: 'any' as const,
  start_date: new Date().toISOString(),
  expiry_date: new Date(Date.now() + 86400000).toISOString(),
};

// ===== getBusinessCouponsPaginatedAction =====

describe('getBusinessCouponsPaginatedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessCouponsPaginatedAction({
      page: 1,
      per_page: 10,
    });
    expect(res.success).toBe(false);
  });

  it('returns paginated coupons when authorized', async () => {
    const mockResult = {
      coupons: [
        { id: COUPON_ID, code: 'TEST10', status: 'published' },
      ] as Coupon[],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };
    vi.mocked(couponQuery.getCouponsPaginated).mockResolvedValueOnce(
      mockResult,
    );

    const res = await getBusinessCouponsPaginatedAction({
      page: 1,
      per_page: 10,
    });
    expect(res.success).toBe(true);
    expect(
      (res as ApiResponse<PaginatedCouponsResponse>).data?.coupons,
    ).toHaveLength(1);
  });

  it('filters by published status', async () => {
    const mockResult = {
      coupons: [
        { id: COUPON_ID, code: 'PUB10', status: 'published' },
      ] as Coupon[],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };
    vi.mocked(couponQuery.getCouponsPaginated).mockResolvedValueOnce(
      mockResult,
    );

    const res = await getBusinessCouponsPaginatedAction({
      page: 1,
      per_page: 10,
      status: 'published',
    });
    expect(res.success).toBe(true);
    expect(couponQuery.getCouponsPaginated).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ status: 'published' }),
    );
  });

  it('filters by draft status', async () => {
    const mockResult = {
      coupons: [
        { id: COUPON_ID, code: 'DRAFT10', status: 'draft' },
      ] as Coupon[],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };
    vi.mocked(couponQuery.getCouponsPaginated).mockResolvedValueOnce(
      mockResult,
    );

    const res = await getBusinessCouponsPaginatedAction({
      page: 1,
      per_page: 10,
      status: 'draft',
    });
    expect(res.success).toBe(true);
    expect(couponQuery.getCouponsPaginated).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('returns INTERNAL_ERROR when query returns error', async () => {
    vi.mocked(couponQuery.getCouponsPaginated).mockResolvedValueOnce({
      coupons: [],
      total: 0,
      error: 'Failed to fetch coupons',
    } as unknown as Awaited<
      ReturnType<typeof couponQuery.getCouponsPaginated>
    >);

    const res = await getBusinessCouponsPaginatedAction({
      page: 1,
      per_page: 10,
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== getBusinessCouponStatsAction =====

describe('getBusinessCouponStatsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessCouponStatsAction();
    expect(res.success).toBe(false);
  });

  it('returns published and draft counts when authorized', async () => {
    vi.mocked(couponQuery.getCouponStatsByBusiness).mockResolvedValueOnce({
      total: 5,
      published: 3,
      draft: 2,
    });

    const res = await getBusinessCouponStatsAction();
    expect(res.success).toBe(true);
    const data = (
      res as ApiResponse<{ total: number; published: number; draft: number }>
    ).data;
    expect(data?.total).toBe(5);
    expect(data?.published).toBe(3);
    expect(data?.draft).toBe(2);
  });
});

// ===== createCouponAction =====

describe('createCouponAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns VALIDATION_ERROR when code is missing', async () => {
    const res = await createCouponAction({ ...baseValidInput, code: '' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when expiry is before start', async () => {
    const res = await createCouponAction({
      ...baseValidInput,
      expiry_date: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await createCouponAction(baseValidInput);
    expect(res.success).toBe(false);
  });

  it('creates coupon with draft status by default', async () => {
    const mockCoupon: Partial<Coupon> = {
      id: COUPON_ID,
      code: 'TEST10',
      status: 'draft',
    };
    const couponService = await import('@/lib/services/couponService');
    vi.mocked(couponService.default.create).mockResolvedValueOnce({
      success: true,
      data: mockCoupon as Coupon,
    });

    const res = await createCouponAction(baseValidInput);
    expect(res.success).toBe(true);
    expect(couponService.default.create).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('creates coupon with published status when specified', async () => {
    const mockCoupon: Partial<Coupon> = {
      id: COUPON_ID,
      code: 'TEST10',
      status: 'published',
    };
    const couponService = await import('@/lib/services/couponService');
    vi.mocked(couponService.default.create).mockResolvedValueOnce({
      success: true,
      data: mockCoupon as Coupon,
    });

    const res = await createCouponAction({
      ...baseValidInput,
      status: 'published',
    });
    expect(res.success).toBe(true);
    expect(couponService.default.create).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ status: 'published' }),
    );
  });

  it('delegates to couponService.create and returns success', async () => {
    const mockCoupon: Partial<Coupon> = { id: COUPON_ID, code: 'TEST10' };
    const couponService = await import('@/lib/services/couponService');
    vi.mocked(couponService.default.create).mockResolvedValueOnce({
      success: true,
      data: mockCoupon as Coupon,
    });

    const res = await createCouponAction(baseValidInput);
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Coupon>).data?.code).toBe('TEST10');
  });
});

// ===== updateCouponAction =====

describe('updateCouponAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns NOT_FOUND when coupon does not exist', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      error: 'Coupon not found',
    });
    const res = await updateCouponAction(COUPON_ID, { status: 'published' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when coupon belongs to different business', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      coupon: { id: COUPON_ID, business_id: 'other-biz-id' } as Coupon,
    });
    const res = await updateCouponAction(COUPON_ID, { status: 'published' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('publishes a draft coupon successfully', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      coupon: {
        id: COUPON_ID,
        business_id: BUSINESS_ID,
        status: 'draft',
      } as Coupon,
    });
    const couponService = await import('@/lib/services/couponService');
    vi.mocked(couponService.default.update).mockResolvedValueOnce({
      success: true,
      data: { id: COUPON_ID, status: 'published' } as Coupon,
    });

    const res = await updateCouponAction(COUPON_ID, { status: 'published' });
    expect(res.success).toBe(true);
    expect(couponService.default.update).toHaveBeenCalledWith(
      COUPON_ID,
      expect.objectContaining({ status: 'published' }),
    );
  });

  it('unpublishes a published coupon to draft successfully', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      coupon: {
        id: COUPON_ID,
        business_id: BUSINESS_ID,
        status: 'published',
      } as Coupon,
    });
    const couponService = await import('@/lib/services/couponService');
    vi.mocked(couponService.default.update).mockResolvedValueOnce({
      success: true,
      data: { id: COUPON_ID, status: 'draft' } as Coupon,
    });

    const res = await updateCouponAction(COUPON_ID, { status: 'draft' });
    expect(res.success).toBe(true);
  });
});

// ===== deleteCouponAction =====

describe('deleteCouponAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await deleteCouponAction(COUPON_ID);
    expect(res.success).toBe(false);
  });

  it('returns NOT_FOUND when coupon does not exist', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      error: 'Coupon not found',
    });
    const res = await deleteCouponAction(COUPON_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when coupon belongs to different business', async () => {
    vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
      coupon: { id: COUPON_ID, business_id: 'other-biz-id' } as Coupon,
    });
    const res = await deleteCouponAction(COUPON_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('deletes both published and draft coupons', async () => {
    for (const status of ['published', 'draft'] as const) {
      vi.mocked(couponQuery.getCouponById).mockResolvedValueOnce({
        coupon: { id: COUPON_ID, business_id: BUSINESS_ID, status } as Coupon,
      });
      const couponService = await import('@/lib/services/couponService');
      vi.mocked(couponService.default.delete).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      const res = await deleteCouponAction(COUPON_ID);
      expect(res.success).toBe(true);
    }
  });
});
