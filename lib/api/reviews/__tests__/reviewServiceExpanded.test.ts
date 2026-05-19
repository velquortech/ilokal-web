import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as reviewService from '@/lib/api/reviews/reviewService';
import * as reviewQuery from '@/lib/api/reviews/reviewQuery';
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  PaginatedReviewsResponse,
} from '@/lib/types';

// Mock reviewQuery module
vi.mock('@/lib/api/reviews/reviewQuery', () => ({
  getReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  getReviewById: vi.fn(),
  getAverageRating: vi.fn(),
}));

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listReviews()', () => {
    it('should return paginated reviews', async () => {
      const mockData: PaginatedReviewsResponse = {
        reviews: [
          {
            id: 'review-1',
            user_id: 'user-1',
            product_id: 'product-1',
            business_id: 'business-1',
            rating: 5,
            review_text: 'Great product!',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
      };

      vi.mocked(reviewQuery.getReviews).mockResolvedValue(mockData);

      const result = await reviewService.listReviews(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should use default pagination params', async () => {
      const mockData: PaginatedReviewsResponse = {
        reviews: [],
        total: 0,
        page: 1,
        per_page: 20,
      };

      vi.mocked(reviewQuery.getReviews).mockResolvedValue(mockData);

      await reviewService.listReviews();

      expect(reviewQuery.getReviews).toHaveBeenCalledWith(1, 20);
    });

    it('should return error on database failure', async () => {
      vi.mocked(reviewQuery.getReviews).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.listReviews();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Failed to list reviews');
    });
  });

  describe('listReviewsForBusiness()', () => {
    it('should list reviews filtered by business ID', async () => {
      const businessId = 'business-1';
      const mockData: PaginatedReviewsResponse = {
        reviews: [
          {
            id: 'review-1',
            user_id: 'user-1',
            product_id: null,
            business_id: businessId,
            rating: 4,
            review_text: 'Good service',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
      };

      vi.mocked(reviewQuery.getReviews).mockResolvedValue(mockData);

      const result = await reviewService.listReviewsForBusiness(businessId);

      expect(result.success).toBe(true);
      expect(reviewQuery.getReviews).toHaveBeenCalledWith(1, 20, {
        business_id: businessId,
      });
    });

    it('should return error on database failure', async () => {
      vi.mocked(reviewQuery.getReviews).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.listReviewsForBusiness('business-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Failed to list business reviews');
    });
  });

  describe('listReviewsForProduct()', () => {
    it('should list reviews filtered by product ID', async () => {
      const productId = 'product-1';
      const mockData: PaginatedReviewsResponse = {
        reviews: [
          {
            id: 'review-1',
            user_id: 'user-1',
            product_id: productId,
            business_id: 'business-1',
            rating: 5,
            review_text: 'Excellent!',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
      };

      vi.mocked(reviewQuery.getReviews).mockResolvedValue(mockData);

      const result = await reviewService.listReviewsForProduct(productId);

      expect(result.success).toBe(true);
      expect(reviewQuery.getReviews).toHaveBeenCalledWith(1, 20, {
        product_id: productId,
      });
    });

    it('should return error on database failure', async () => {
      vi.mocked(reviewQuery.getReviews).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.listReviewsForProduct('product-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Failed to list product reviews');
    });
  });

  describe('createReview()', () => {
    it('should create a review successfully', async () => {
      const input: Record<string, unknown> = {
        user_id: 'user-1',
        product_id: 'product-1',
        business_id: 'business-1',
        rating: 5,
        review_text: 'Great!',
      };

      vi.mocked(reviewQuery.createReview).mockResolvedValue(input);

      const result = await reviewService.createReview(
        input as CreateReviewRequest,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    it('should return error on creation failure', async () => {
      const input: CreateReviewRequest = {
        user_id: 'user-1',
        product_id: 'product-1',
        business_id: 'business-1',
        rating: 5,
        review_text: 'Great!',
      };

      vi.mocked(reviewQuery.createReview).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.createReview(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Failed to create review');
    });
  });

  describe('updateReview()', () => {
    it('should update review without actor (no auth check)', async () => {
      const id = 'review-1';
      const input: UpdateReviewRequest = {
        rating: 4,
        review_text: 'Updated review',
      };

      vi.mocked(reviewQuery.updateReview).mockResolvedValue({
        id,
        ...input,
      });

      const result = await reviewService.updateReview(id, input);

      expect(result.success).toBe(true);
      expect(reviewQuery.updateReview).toHaveBeenCalledWith(
        id,
        expect.any(Object),
      );
    });

    it('should allow admin to update any review', async () => {
      const id = 'review-1';
      const input: UpdateReviewRequest = {
        rating: 3,
        review_text: 'Updated by admin',
      };

      const existingReview = {
        data: {
          id,
          user_id: 'user-1',
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Original review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);
      vi.mocked(reviewQuery.updateReview).mockResolvedValue({
        id,
        ...input,
      });

      const result = await reviewService.updateReview(id, input, {
        userId: 'admin-1',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('should allow owner to update their review', async () => {
      const id = 'review-1';
      const userId = 'user-1';
      const input: UpdateReviewRequest = {
        rating: 4,
        review_text: 'Updated by owner',
      };

      const existingReview = {
        data: {
          id,
          user_id: userId,
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Original review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);
      vi.mocked(reviewQuery.updateReview).mockResolvedValue({
        id,
        ...input,
      });

      const result = await reviewService.updateReview(id, input, {
        userId,
        role: 'app_user',
      });

      expect(result.success).toBe(true);
    });

    it('should deny non-owner from updating review', async () => {
      const id = 'review-1';
      const input: UpdateReviewRequest = {
        rating: 4,
        review_text: 'Hacked review',
      };

      const existingReview = {
        data: {
          id,
          user_id: 'user-1',
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Original review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);

      const result = await reviewService.updateReview(id, input, {
        userId: 'user-2',
        role: 'app_user',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return not found when review does not exist', async () => {
      const id = 'review-1';
      const input: UpdateReviewRequest = {
        rating: 4,
        review_text: 'Update',
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue({
        error: 'Not found',
      });

      const result = await reviewService.updateReview(id, input, {
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error on update failure', async () => {
      const id = 'review-1';
      const input: UpdateReviewRequest = {
        rating: 4,
        review_text: 'Update',
      };

      vi.mocked(reviewQuery.updateReview).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.updateReview(id, input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('deleteReview()', () => {
    it('should delete review without actor (no auth check)', async () => {
      const id = 'review-1';

      vi.mocked(reviewQuery.deleteReview).mockResolvedValue(undefined);

      const result = await reviewService.deleteReview(id);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should allow admin to delete any review', async () => {
      const id = 'review-1';

      const existingReview = {
        data: {
          id,
          user_id: 'user-1',
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);
      vi.mocked(reviewQuery.deleteReview).mockResolvedValue(undefined);

      const result = await reviewService.deleteReview(id, {
        userId: 'admin-1',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('should allow owner to delete their review', async () => {
      const id = 'review-1';
      const userId = 'user-1';

      const existingReview = {
        data: {
          id,
          user_id: userId,
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);
      vi.mocked(reviewQuery.deleteReview).mockResolvedValue(undefined);

      const result = await reviewService.deleteReview(id, { userId });

      expect(result.success).toBe(true);
    });

    it('should deny non-owner from deleting review', async () => {
      const id = 'review-1';

      const existingReview = {
        data: {
          id,
          user_id: 'user-1',
          product_id: 'product-1',
          business_id: 'business-1',
          rating: 5,
          review_text: 'Review',
        },
      };

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue(existingReview);

      const result = await reviewService.deleteReview(id, {
        userId: 'user-2',
        role: 'app_user',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return not found when review does not exist', async () => {
      const id = 'review-1';

      vi.mocked(reviewQuery.getReviewById).mockResolvedValue({
        error: 'Not found',
      });

      const result = await reviewService.deleteReview(id, {
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error on delete failure', async () => {
      const id = 'review-1';

      vi.mocked(reviewQuery.deleteReview).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.deleteReview(id);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getRating()', () => {
    it('should get average rating for business', async () => {
      const businessId = 'business-1';

      vi.mocked(reviewQuery.getAverageRating).mockResolvedValue({
        average_rating: 4.5,
        review_count: 10,
      });

      const result = await reviewService.getRating(businessId, 'business');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(businessId);
      expect(result.data?.average_rating).toBe(4.5);
      expect(result.data?.review_count).toBe(10);
      expect(reviewQuery.getAverageRating).toHaveBeenCalledWith(
        businessId,
        'business',
      );
    });

    it('should get average rating for product', async () => {
      const productId = 'product-1';

      vi.mocked(reviewQuery.getAverageRating).mockResolvedValue({
        average_rating: 3.8,
        review_count: 5,
      });

      const result = await reviewService.getRating(productId, 'product');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(productId);
      expect(result.data?.average_rating).toBe(3.8);
      expect(result.data?.review_count).toBe(5);
      expect(reviewQuery.getAverageRating).toHaveBeenCalledWith(
        productId,
        'product',
      );
    });

    it('should handle zero reviews', async () => {
      const businessId = 'business-new';

      vi.mocked(reviewQuery.getAverageRating).mockResolvedValue({
        average_rating: 0,
        review_count: 0,
      });

      const result = await reviewService.getRating(businessId, 'business');

      expect(result.success).toBe(true);
      expect(result.data?.average_rating).toBe(0);
      expect(result.data?.review_count).toBe(0);
    });

    it('should return error on rating calculation failure', async () => {
      vi.mocked(reviewQuery.getAverageRating).mockRejectedValue(
        new Error('DB error'),
      );

      const result = await reviewService.getRating('business-1', 'business');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('Failed to get rating');
    });
  });
});
