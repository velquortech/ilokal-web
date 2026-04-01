import http from './client';
import type {
  ApiResponse,
  Coupon,
  CouponDetailResponse,
  CreateCouponRequest,
  UpdateCouponRequest,
  FeaturedDeal,
  CreateFeaturedDealRequest,
  UpdateFeaturedDealRequest,
} from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/coupons/couponService');
  return client;
}

const couponService = {
  async list() {
    return await http.get('/coupons');
  },

  async get(id: string) {
    return await http.get(`/coupons/${id}`);
  },

  async create(
    businessId: string,
    input: CreateCouponRequest,
  ): Promise<ApiResponse<Coupon>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createCoupon(businessId, input);
    }

    try {
      const res = await http.post('/coupons', {
        business_id: businessId,
        ...input,
      });
      return res as ApiResponse<Coupon>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async update(
    id: string,
    input: UpdateCouponRequest,
  ): Promise<ApiResponse<Coupon>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateCoupon(id, input);
    }

    try {
      const res = await http.put(`/coupons/${id}`, input);
      return res as ApiResponse<Coupon>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.deleteCoupon(id);
    }

    try {
      const res = await http.del(`/coupons/${id}`);
      return res as ApiResponse<null>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async redeem(
    code: string,
    userId: string,
  ): Promise<ApiResponse<CouponDetailResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.redeemCoupon(code, userId);
    }

    try {
      const res = await http.post('/coupons/redeem', { code, user_id: userId });
      return res as ApiResponse<CouponDetailResponse>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async redeemAtBranch(
    couponId: string,
    branchId: string,
  ): Promise<ApiResponse> {
    try {
      const res = await http.post(`/coupons/${couponId}/redeem`, {
        branch_id: branchId,
      });
      return res as ApiResponse;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  // Featured deals
  async createFeaturedDeal(
    businessId: string,
    input: CreateFeaturedDealRequest,
  ): Promise<ApiResponse<FeaturedDeal>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createFeaturedDeal(businessId, input);
    }

    try {
      const res = await http.post('/featured-deals', {
        business_id: businessId,
        ...input,
      });
      return res as ApiResponse<FeaturedDeal>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async updateFeaturedDeal(
    id: string,
    input: UpdateFeaturedDealRequest,
  ): Promise<ApiResponse<FeaturedDeal>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateFeaturedDeal(id, input);
    }

    try {
      const res = await http.put(`/featured-deals/${id}`, input);
      return res as ApiResponse<FeaturedDeal>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async deleteFeaturedDeal(id: string): Promise<ApiResponse<null>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.deleteFeaturedDeal(id);
    }

    try {
      const res = await http.del(`/featured-deals/${id}`);
      return res as ApiResponse<null>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

export default couponService;
