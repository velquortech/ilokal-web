import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as couponQuery from '@/lib/api/coupons/couponQuery';
import * as supabaseServer from '@/supabase/server';

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('couponQuery', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };
  let chainedMock: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lt: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    chainedMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn(() => chainedMock),
    };

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createServerSupabaseClient>
      >,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===== Coupon Tests =====

  describe('getCouponsPaginated()', () => {
    it('should fetch paginated coupons for a business', async () => {
      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'SAVE10',
          discount_percentage: 10,
          business_id: 'biz-1',
        },
      ];

      chainedMock.range.mockResolvedValue({
        data: mockCoupons,
        count: 1,
        error: null,
      });

      const result = await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
      });

      expect(result.coupons).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.total_pages).toBe(1);
    });

    it('should filter active coupons by status', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        status: 'active',
      });

      expect(chainedMock.lte).toHaveBeenCalled();
      expect(chainedMock.gte).toHaveBeenCalled();
    });

    it('should filter expired coupons', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        status: 'expired',
      });

      expect(chainedMock.lt).toHaveBeenCalled();
    });

    it('should search coupons by code or description', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        search: 'SAVE10',
      });

      expect(chainedMock.or).toHaveBeenCalled();
    });

    it('should sort by creation date newest first', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        sort_by: 'newest',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should sort by expiry date ascending', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        sort_by: 'expiry_asc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('expiry_date', {
        ascending: true,
      });
    });

    it('should handle pagination correctly', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 100,
        error: null,
      });

      const result = await couponQuery.getCouponsPaginated('biz-1', {
        page: 3,
        per_page: 20,
      });

      expect(chainedMock.range).toHaveBeenCalledWith(40, 59);
      expect(result.total_pages).toBe(5);
    });

    it('should handle database error', async () => {
      chainedMock.range.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'DB error' },
      });

      const result = await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
      });

      expect(result.coupons).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCouponById()', () => {
    it('should fetch coupon by ID', async () => {
      const couponId = 'coupon-1';
      const mockCoupon = {
        id: couponId,
        code: 'SAVE10',
        discount_percentage: 10,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCoupon,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await couponQuery.getCouponById(couponId);

      expect(result.coupon).toEqual(mockCoupon);
      expect(result.error).toBeUndefined();
    });

    it('should return error when coupon not found', async () => {
      const couponId = 'nonexistent';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await couponQuery.getCouponById(couponId);

      expect(result.coupon).toBeUndefined();
      expect(result.error).toBe('Coupon not found');
    });
  });

  describe('getCouponByCode()', () => {
    it('should fetch coupon by code and uppercase it', async () => {
      const code = 'save10';
      const mockCoupon = {
        id: 'coupon-1',
        code: 'SAVE10',
        discount_percentage: 10,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockCoupon,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await couponQuery.getCouponByCode(code);

      expect(result.coupon).toEqual(mockCoupon);
      expect(mockEq).toHaveBeenCalledWith('code', 'SAVE10');
    });

    it('should return error for invalid coupon code', async () => {
      const code = 'INVALID';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await couponQuery.getCouponByCode(code);

      expect(result.coupon).toBeUndefined();
      expect(result.error).toBe('Invalid coupon code');
    });
  });

  describe('couponExists()', () => {
    it('should return true when coupon exists', async () => {
      const couponId = 'coupon-1';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 1,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await couponQuery.couponExists(couponId);

      expect(result).toBe(true);
    });

    it('should return false when coupon does not exist', async () => {
      const couponId = 'nonexistent';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await couponQuery.couponExists(couponId);

      expect(result).toBe(false);
    });
  });

  describe('getRedemptionStats()', () => {
    it('should fetch redemption stats for a coupon', async () => {
      const couponId = 'coupon-1';
      const mockCoupon = {
        id: couponId,
        code: 'SAVE10',
        max_redemptions_global: 100,
      };

      const mockSelect1 = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockSingle1 = vi.fn().mockResolvedValue({
        data: mockCoupon,
        error: null,
      });

      const mockSelect2 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({
        count: 25,
        error: null,
      });

      const mockSelect3 = vi.fn().mockReturnThis();
      const mockEq3 = vi.fn().mockResolvedValue({
        data: [
          { user_id: 'user-1' },
          { user_id: 'user-2' },
          { user_id: 'user-1' },
        ],
        error: null,
      });

      const mockSelect4 = vi.fn().mockReturnThis();
      const mockEq4 = vi.fn().mockReturnThis();
      const mockOrder4 = vi.fn().mockReturnThis();
      const mockLimit4 = vi.fn().mockReturnThis();
      const mockSingle4 = vi.fn().mockResolvedValue({
        data: { redeemed_at: '2024-01-01T00:00:00Z' },
        error: null,
      });

      // Setup for 4 queries
      const callCount = { count: 0 };
      mockSupabase.from.mockImplementation((_table: string) => {
        callCount.count++;
        if (callCount.count === 1) {
          return { select: mockSelect1 };
        } else if (callCount.count === 2) {
          return { select: mockSelect2 };
        } else if (callCount.count === 3) {
          return { select: mockSelect3 };
        } else {
          return { select: mockSelect4 };
        }
      });

      mockSelect1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ single: mockSingle1 });

      mockSelect2.mockReturnValue({ eq: mockEq2 });

      mockSelect3.mockReturnValue({ eq: mockEq3 });

      mockSelect4.mockReturnValue({
        eq: mockEq4,
      });
      mockEq4.mockReturnValue({
        order: mockOrder4,
      });
      mockOrder4.mockReturnValue({
        limit: mockLimit4,
      });
      mockLimit4.mockReturnValue({
        single: mockSingle4,
      });

      const result = await couponQuery.getRedemptionStats(couponId);

      expect(result).not.toBeNull();
      expect(result?.total_redemptions).toBe(25);
      expect(result?.unique_users).toBe(2);
      expect(result?.remaining_global).toBe(75); // 100 - 25
    });

    it('should return null when coupon not found', async () => {
      const couponId = 'nonexistent';

      const mockSelect1 = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockSingle1 = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect1 });
      mockSelect1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ single: mockSingle1 });

      const result = await couponQuery.getRedemptionStats(couponId);

      expect(result).toBeNull();
    });
  });

  // ===== Featured Deal Tests =====

  describe('getFeaturedDealsPaginated()', () => {
    it('should fetch paginated featured deals', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Summer Sale',
          placement: 'home_banner',
          start_date: new Date(Date.now() - 1000000).toISOString(),
          end_date: new Date(Date.now() + 1000000).toISOString(),
          archived_at: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockDeals,
        count: 1,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await couponQuery.getFeaturedDealsPaginated({
        page: 1,
        per_page: 20,
      });

      expect(result.deals).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter featured deals by placement', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        lte: mockLte,
      });
      mockLte.mockReturnValue({
        gte: mockGte,
      });
      mockGte.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      await couponQuery.getFeaturedDealsPaginated({
        page: 1,
        per_page: 20,
        placement: 'homepage_banner',
      });

      expect(mockEq).toHaveBeenCalledWith('placement', 'homepage_banner');
    });
  });

  describe('getFeaturedDealsByBusinessId()', () => {
    it('should fetch featured deals for a business', async () => {
      const businessId = 'biz-1';
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Summer Sale',
          business_id: businessId,
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockDeals,
        count: 1,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq1,
      });
      mockEq1.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });

      const result = await couponQuery.getFeaturedDealsByBusinessId(
        businessId,
        {
          page: 1,
          per_page: 20,
        },
      );

      expect(result.deals).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getFeaturedDealById()', () => {
    it('should fetch featured deal by ID', async () => {
      const dealId = 'deal-1';
      const mockDeal = {
        id: dealId,
        title: 'Summer Sale',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockDeal,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        single: mockSingle,
      });

      const result = await couponQuery.getFeaturedDealById(dealId);

      expect(result.deal).toEqual(mockDeal);
      expect(result.error).toBeUndefined();
    });
  });

  describe('featuredDealExists()', () => {
    it('should return true when featured deal exists', async () => {
      const dealId = 'deal-1';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 1,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await couponQuery.featuredDealExists(dealId);

      expect(result).toBe(true);
    });

    it('should return false when featured deal does not exist', async () => {
      const dealId = 'nonexistent';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValue({
        count: 0,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        is: mockIs,
      });

      const result = await couponQuery.featuredDealExists(dealId);

      expect(result).toBe(false);
    });
  });
});
