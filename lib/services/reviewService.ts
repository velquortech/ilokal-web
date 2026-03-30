import http from './client';
import type { ApiResponse, RatingResponse } from '@/lib/types';
import type { CreateReviewRequest, UpdateReviewRequest } from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/reviews/reviewService');
  return client;
}

const reviewService = {
  async createReview(
    input: CreateReviewRequest,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createReview(input as any);
    }

    try {
      const res = await http.post('/reviews', input);
      return res as ApiResponse<Record<string, unknown>>;
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

  async updateReview(
    id: string,
    input: UpdateReviewRequest,
    actor?: { userId: string; role?: string },
  ): Promise<ApiResponse<Record<string, unknown>>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateReview(id, input as any, actor as any);
    }

    try {
      const res = await http.put(`/reviews/${id}`, input);
      return res as ApiResponse<Record<string, unknown>>;
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

  async deleteReview(
    id: string,
    actor?: { userId: string; role?: string },
  ): Promise<ApiResponse<null>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.deleteReview(id, actor as any);
    }

    try {
      const res = await http.del(`/reviews/${id}`);
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

  async getRating(
    id: string,
    type: 'business' | 'product',
  ): Promise<ApiResponse<RatingResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.getRating(id, type);
    }

    try {
      const res = await http.get<RatingResponse>(
        `/reviews/${id}/rating?type=${type}`,
      );
      return { success: true, data: res } as ApiResponse<RatingResponse>;
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

export default reviewService;
