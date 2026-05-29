import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as couponQuery from '@/lib/api/coupons/couponQuery';
import * as supabaseServer from '@/supabase/server';

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
    update: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
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
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
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

  // ===== getCouponsPaginated =====

  describe('getCouponsPaginated()', () => {
    it('fetches paginated coupons for a business', async () => {
      const mockCoupons = [
        {
          id: 'coupon-1',
          code: 'SAVE10',
          business_id: 'biz-1',
          status: 'published',
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

    it('filters by published status using eq on status column', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        status: 'published',
      });

      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'published');
    });

    it('filters by draft status using eq on status column', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        status: 'draft',
      });

      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('returns all coupons when no status filter is provided', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', { page: 1, per_page: 20 });

      const eqCalls = vi.mocked(chainedMock.eq).mock.calls;
      const statusCalls = eqCalls.filter(([col]) => col === 'status');
      expect(statusCalls).toHaveLength(0);
    });

    it('searches coupons by code or description', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        search: 'SAVE10',
      });

      expect(chainedMock.or).toHaveBeenCalled();
    });

    it('sorts by creation date newest first by default', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        sort_by: 'newest',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('sorts by expiry date ascending', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await couponQuery.getCouponsPaginated('biz-1', {
        page: 1,
        per_page: 20,
        sort_by: 'expiry_asc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('expiry_date', {
        ascending: true,
      });
    });

    it('calculates correct pagination offsets', async () => {
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

    it('returns error shape when database fails', async () => {
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

  // ===== getCouponStatsByBusiness =====

  describe('getCouponStatsByBusiness()', () => {
    it('returns total, published, and draft counts', async () => {
      chainedMock.eq.mockResolvedValue({
        data: [
          { status: 'published', archived_at: null },
          { status: 'published', archived_at: null },
          { status: 'draft', archived_at: null },
        ],
        error: null,
      });

      const result = await couponQuery.getCouponStatsByBusiness('biz-1');

      expect(result.total).toBe(3);
      expect(result.published).toBe(2);
      expect(result.draft).toBe(1);
    });

    it('excludes archived coupons from counts', async () => {
      chainedMock.eq.mockResolvedValue({
        data: [
          { status: 'published', archived_at: null },
          { status: 'published', archived_at: '2026-01-01T00:00:00Z' },
          { status: 'draft', archived_at: null },
        ],
        error: null,
      });

      const result = await couponQuery.getCouponStatsByBusiness('biz-1');

      expect(result.total).toBe(2);
      expect(result.published).toBe(1);
      expect(result.draft).toBe(1);
    });

    it('returns zeros when no coupons exist', async () => {
      chainedMock.eq.mockResolvedValue({ data: [], error: null });

      const result = await couponQuery.getCouponStatsByBusiness('biz-1');

      expect(result.total).toBe(0);
      expect(result.published).toBe(0);
      expect(result.draft).toBe(0);
    });

    it('returns zeros when database fails', async () => {
      chainedMock.eq.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      const result = await couponQuery.getCouponStatsByBusiness('biz-1');

      expect(result.total).toBe(0);
      expect(result.published).toBe(0);
      expect(result.draft).toBe(0);
    });

    it('applies branch_id filter when branchId is provided', async () => {
      // When branchId is set, chain is: .eq(business_id).eq(branch_id) — need
      // first eq to chain, second eq to resolve with data.
      chainedMock.eq
        .mockReturnValueOnce(chainedMock)   // eq('business_id', ...) → chain
        .mockResolvedValueOnce({            // eq('branch_id', ...) → data
          data: [{ status: 'published', archived_at: null }],
          error: null,
        });

      const result = await couponQuery.getCouponStatsByBusiness(
        'biz-1',
        'branch-42',
      );

      expect(chainedMock.eq).toHaveBeenCalledWith('branch_id', 'branch-42');
      expect(result.total).toBe(1);
      expect(result.published).toBe(1);
    });

    it('does not filter by branch_id when branchId is omitted', async () => {
      chainedMock.eq.mockResolvedValue({ data: [], error: null });

      await couponQuery.getCouponStatsByBusiness('biz-1');

      const branchCall = chainedMock.eq.mock.calls.find(
        ([col]: [string]) => col === 'branch_id',
      );
      expect(branchCall).toBeUndefined();
    });
  });

  // ===== getCouponById =====

  describe('getCouponById()', () => {
    it('fetches coupon by ID', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'SAVE10',
        status: 'published',
      };
      chainedMock.single.mockResolvedValue({ data: mockCoupon, error: null });

      const result = await couponQuery.getCouponById('coupon-1');

      expect(result.coupon).toEqual(mockCoupon);
      expect(result.error).toBeUndefined();
    });

    it('returns error when coupon not found', async () => {
      chainedMock.single.mockResolvedValue({ data: null, error: null });

      const result = await couponQuery.getCouponById('nonexistent');

      expect(result.coupon).toBeUndefined();
      expect(result.error).toBe('Coupon not found');
    });
  });

  // ===== getCouponByCode =====

  describe('getCouponByCode()', () => {
    it('fetches coupon by code uppercased and filters by published status', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        code: 'SAVE10',
        status: 'published',
      };
      chainedMock.single.mockResolvedValue({ data: mockCoupon, error: null });

      const result = await couponQuery.getCouponByCode('save10');

      expect(result.coupon).toEqual(mockCoupon);
      expect(chainedMock.eq).toHaveBeenCalledWith('code', 'SAVE10');
      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'published');
    });

    it('returns error for draft coupon code (not published)', async () => {
      chainedMock.single.mockResolvedValue({ data: null, error: null });

      const result = await couponQuery.getCouponByCode('DRAFT10');

      expect(result.coupon).toBeUndefined();
      expect(result.error).toBe('Invalid coupon code');
    });

    it('returns error when coupon does not exist', async () => {
      chainedMock.single.mockResolvedValue({ data: null, error: null });

      const result = await couponQuery.getCouponByCode('INVALID');

      expect(result.coupon).toBeUndefined();
      expect(result.error).toBe('Invalid coupon code');
    });
  });

  // ===== couponExists =====

  describe('couponExists()', () => {
    it('returns true when coupon exists', async () => {
      chainedMock.is.mockResolvedValue({ count: 1, error: null });

      const result = await couponQuery.couponExists('coupon-1');

      expect(result).toBe(true);
    });

    it('returns false when coupon does not exist', async () => {
      chainedMock.is.mockResolvedValue({ count: 0, error: null });

      const result = await couponQuery.couponExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ===== getRedemptionStats =====

  describe('getRedemptionStats()', () => {
    it('returns redemption stats for a coupon', async () => {
      const couponId = 'coupon-1';
      const mockCoupon = {
        id: couponId,
        code: 'SAVE10',
        max_redemptions_global: 100,
      };

      const mockSelect1 = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockSingle1 = vi
        .fn()
        .mockResolvedValue({ data: mockCoupon, error: null });

      const mockSelect2 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockResolvedValue({ count: 25, error: null });

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

      const callCount = { count: 0 };
      mockSupabase.from.mockImplementation(() => {
        callCount.count++;
        if (callCount.count === 1) return { select: mockSelect1 };
        if (callCount.count === 2) return { select: mockSelect2 };
        if (callCount.count === 3) return { select: mockSelect3 };
        return { select: mockSelect4 };
      });

      mockSelect1.mockReturnValue({ eq: mockEq1 });
      mockEq1.mockReturnValue({ single: mockSingle1 });
      mockSelect2.mockReturnValue({ eq: mockEq2 });
      mockSelect3.mockReturnValue({ eq: mockEq3 });
      mockSelect4.mockReturnValue({ eq: mockEq4 });
      mockEq4.mockReturnValue({ order: mockOrder4 });
      mockOrder4.mockReturnValue({ limit: mockLimit4 });
      mockLimit4.mockReturnValue({ single: mockSingle4 });

      const result = await couponQuery.getRedemptionStats(couponId);

      expect(result).not.toBeNull();
      expect(result?.total_redemptions).toBe(25);
      expect(result?.unique_users).toBe(2);
      expect(result?.remaining_global).toBe(75);
    });

    it('returns null when coupon not found', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      const result = await couponQuery.getRedemptionStats('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ===== getFeaturedDealsPaginated =====

  describe('getFeaturedDealsPaginated()', () => {
    it('fetches paginated featured deals', async () => {
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
      const mockRange = vi
        .fn()
        .mockResolvedValue({ data: mockDeals, count: 1, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      const result = await couponQuery.getFeaturedDealsPaginated({
        page: 1,
        per_page: 20,
      });

      expect(result.deals).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters featured deals by placement', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockLte = vi.fn().mockReturnThis();
      const mockGte = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi
        .fn()
        .mockResolvedValue({ data: [], count: 0, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ lte: mockLte });
      mockLte.mockReturnValue({ gte: mockGte });
      mockGte.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      await couponQuery.getFeaturedDealsPaginated({
        page: 1,
        per_page: 20,
        placement: 'homepage_banner',
      });

      expect(mockEq).toHaveBeenCalledWith('placement', 'homepage_banner');
    });
  });

  // ===== getFeaturedDealsByBusinessId =====

  describe('getFeaturedDealsByBusinessId()', () => {
    it('fetches featured deals for a business', async () => {
      const businessId = 'biz-1';
      const mockDeals = [
        { id: 'deal-1', title: 'Summer Sale', business_id: businessId },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi
        .fn()
        .mockResolvedValue({ data: mockDeals, count: 1, error: null });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

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

  // ===== getFeaturedDealById =====

  describe('getFeaturedDealById()', () => {
    it('fetches featured deal by ID', async () => {
      const mockDeal = { id: 'deal-1', title: 'Summer Sale' };
      chainedMock.single.mockResolvedValue({ data: mockDeal, error: null });

      const result = await couponQuery.getFeaturedDealById('deal-1');

      expect(result.deal).toEqual(mockDeal);
      expect(result.error).toBeUndefined();
    });
  });

  // ===== featuredDealExists =====

  describe('featuredDealExists()', () => {
    it('returns true when featured deal exists', async () => {
      chainedMock.is.mockResolvedValue({ count: 1, error: null });

      const result = await couponQuery.featuredDealExists('deal-1');

      expect(result).toBe(true);
    });

    it('returns false when featured deal does not exist', async () => {
      chainedMock.is.mockResolvedValue({ count: 0, error: null });

      const result = await couponQuery.featuredDealExists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
