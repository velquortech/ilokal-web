'use server';

import type { ApiResponse } from '@/lib/types';
import * as reviewService from '@/lib/api/reviews/reviewService';
import type { CreateReviewRequest, UpdateReviewRequest } from '@/lib/types';
import {
  createReviewSchema,
  updateReviewSchema,
} from '@/lib/validation/reviews';

export async function createReviewAction(input: CreateReviewRequest) {
  try {
    // Validate
    const parsed = createReviewSchema.parse(input);
    const result = await reviewService.createReview(parsed);
    return result;
  } catch (error) {
    console.error('[createReviewAction]', error);
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: (error as Error).message },
    } as ApiResponse<null>;
  }
}

export async function updateReviewAction(
  id: string,
  input: UpdateReviewRequest,
) {
  try {
    const parsed = updateReviewSchema.parse(input);
    const result = await reviewService.updateReview(id, parsed);
    return result;
  } catch (error) {
    console.error('[updateReviewAction]', error);
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: (error as Error).message },
    } as ApiResponse<null>;
  }
}

export async function deleteReviewAction(id: string) {
  try {
    const result = await reviewService.deleteReview(id);
    return result;
  } catch (error) {
    console.error('[deleteReviewAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete review' },
    } as ApiResponse<null>;
  }
}

export async function getRatingAction(
  id: string,
  type: 'business' | 'product',
) {
  try {
    const result = await reviewService.getRating(id, type);
    return result;
  } catch (error) {
    console.error('[getRatingAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get rating' },
    } as ApiResponse<null>;
  }
}
