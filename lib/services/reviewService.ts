import http from './client';
import type { ApiResponse, RatingResponse, Review } from '@/lib/types';
import type { CreateReviewRequest, UpdateReviewRequest } from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/reviews/reviewService');
  return client;
}

const reviewService = {
  async createReview(input: CreateReviewRequest): Promise<ApiResponse<Review>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return (await client.createReview(input)) as ApiResponse<Review>;
    }

    try {
      const res = await http.post<Review>('/reviews', input);
      return { success: true, data: res } as ApiResponse<Review>;
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
  ): Promise<ApiResponse<Review>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return (await client.updateReview(
        id,
        input,
        actor,
      )) as ApiResponse<Review>;
    }

    try {
      const res = await http.put<Review>(`/reviews/${id}`, input);
      return { success: true, data: res } as ApiResponse<Review>;
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
      return await client.deleteReview(id, actor);
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
