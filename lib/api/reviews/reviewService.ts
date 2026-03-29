import type { ApiResponse } from '@/lib/types';
import type {
  CreateReviewRequest,
  UpdateReviewRequest,
  PaginatedReviewsResponse,
  RatingResponse,
} from '@/lib/types';
import * as reviewQuery from './reviewQuery';

export async function listReviews(
  page = 1,
  per_page = 20,
): Promise<ApiResponse<PaginatedReviewsResponse>> {
  try {
    const data = await reviewQuery.getReviews(page, per_page);
    return { success: true, data };
  } catch (error) {
    console.error('[listReviews]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list reviews' },
    };
  }
}

export async function listReviewsForBusiness(
  businessId: string,
  page = 1,
  per_page = 20,
): Promise<ApiResponse<PaginatedReviewsResponse>> {
  try {
    const data = await reviewQuery.getReviews(page, per_page, {
      business_id: businessId,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[listReviewsForBusiness]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list business reviews',
      },
    };
  }
}

export async function listReviewsForProduct(
  productId: string,
  page = 1,
  per_page = 20,
): Promise<ApiResponse<PaginatedReviewsResponse>> {
  try {
    const data = await reviewQuery.getReviews(page, per_page, {
      product_id: productId,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[listReviewsForProduct]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list product reviews',
      },
    };
  }
}

export async function createReview(
  input: CreateReviewRequest,
): Promise<ApiResponse<Record<string, unknown>>> {
  try {
    const inserted = await reviewQuery.createReview(
      input as unknown as Record<string, unknown>,
    );
    return { success: true, data: inserted } as ApiResponse<
      Record<string, unknown>
    >;
  } catch (error) {
    console.error('[createReview]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create review' },
    };
  }
}

export async function updateReview(
  id: string,
  input: UpdateReviewRequest,
  actor?: { userId: string; role?: string },
): Promise<ApiResponse<Record<string, unknown>>> {
  try {
    // ownership check
    if (actor) {
      const existing = await reviewQuery.getReviewById(id);
      if ('error' in existing) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Review not found' },
        };
      }
      const reviewRow = existing.data as Record<string, unknown>;
      const ownerId = String(reviewRow.user_id || '');
      if (actor.role !== 'admin' && ownerId !== actor.userId) {
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to update this review',
          },
        };
      }
    }

    const updated = await reviewQuery.updateReview(
      id,
      input as unknown as Record<string, unknown>,
    );
    return { success: true, data: updated } as ApiResponse<
      Record<string, unknown>
    >;
  } catch (error) {
    console.error('[updateReview]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update review' },
    };
  }
}

export async function deleteReview(
  id: string,
  actor?: { userId: string; role?: string },
): Promise<ApiResponse<null>> {
  try {
    if (actor) {
      const existing = await reviewQuery.getReviewById(id);
      if ('error' in existing) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Review not found' },
        };
      }
      const reviewRow = existing.data as Record<string, unknown>;
      const ownerId = String(reviewRow.user_id || '');
      if (actor.role !== 'admin' && ownerId !== actor.userId) {
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to delete this review',
          },
        };
      }
    }

    await reviewQuery.deleteReview(id);
    return { success: true, data: null };
  } catch (error) {
    console.error('[deleteReview]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' },
    };
  }
}

export async function getRating(
  id: string,
  type: 'business' | 'product',
): Promise<ApiResponse<RatingResponse>> {
  try {
    const data = await reviewQuery.getAverageRating(id, type);
    return {
      success: true,
      data: {
        id,
        average_rating: data.average_rating,
        review_count: data.review_count,
      },
    };
  } catch (error) {
    console.error('[getRating]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get rating' },
    };
  }
}
