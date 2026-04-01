import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Rating, CreateRatingRequest } from '@/lib/types';

// Mock the HTTP client
vi.mock('@/lib/services/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

import httpClient from '@/lib/services/client';
import ratingService from '@/lib/services/ratingService';

describe('ratingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rating with valid data', async () => {
      const mockRating: Rating = {
        id: '123',
        user_id: 'user-1',
        product_id: 'product-1',
        rating: 5,
        review_text: 'Great product!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce(mockRating);

      const request: CreateRatingRequest = {
        product_id: 'product-1',
        rating: 5,
        review_text: 'Great product!',
      };

      const result = await ratingService.create(request);
      expect(result).toEqual(mockRating);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/ratings',
        expect.objectContaining(request),
      );
    });

    it('should handle rating without review', async () => {
      const mockRating: Rating = {
        id: '124',
        user_id: 'user-1',
        business_id: 'business-1',
        rating: 4,
        review_text: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce(mockRating);

      const request: CreateRatingRequest = {
        business_id: 'business-1',
        rating: 4,
      };

      const result = await ratingService.create(request);
      expect(result.review_text).toBeNull();
      expect(httpClient.post).toHaveBeenCalled();
    });

    it('should handle API errors during creation', async () => {
      const error = new Error('API Error');
      vi.mocked(httpClient.post).mockRejectedValueOnce(error);

      const request: CreateRatingRequest = {
        product_id: 'product-1',
        rating: 3,
      };

      await expect(ratingService.create(request)).rejects.toThrow('API Error');
    });
  });

  describe('get', () => {
    it('should retrieve a rating by id', async () => {
      const mockRating: Rating = {
        id: '123',
        user_id: 'user-1',
        product_id: 'product-1',
        rating: 5,
        review_text: 'Great!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockRating);

      const result = await ratingService.get('123');
      expect(result).toEqual(mockRating);
      expect(httpClient.get).toHaveBeenCalledWith('/ratings/123');
    });

    it('should handle not found error', async () => {
      const error = new Error('Not found');
      vi.mocked(httpClient.get).mockRejectedValueOnce(error);

      await expect(ratingService.get('nonexistent')).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('list', () => {
    it('should list ratings with default pagination', async () => {
      const mockRatings: Rating[] = [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          rating: 5,
          review_text: 'Excellent',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockRatings);

      const result = await ratingService.list();
      expect(result).toEqual(mockRatings);
      expect(httpClient.get).toHaveBeenCalled();
    });

    it('should list ratings filtered by entity', async () => {
      const mockRatings: Rating[] = [];

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockRatings);

      await ratingService.list({
        product_id: 'product-1',
      });

      expect(httpClient.get).toHaveBeenCalled();
    });

    it('should list ratings with custom pagination', async () => {
      const mockRatings: Rating[] = [];

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockRatings);

      await ratingService.list({ limit: 50, offset: 100 });

      expect(httpClient.get).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a rating', async () => {
      const mockUpdatedRating: Rating = {
        id: '123',
        user_id: 'user-1',
        product_id: 'product-1',
        rating: 4,
        review_text: 'Updated review',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(httpClient.put).mockResolvedValueOnce(mockUpdatedRating);

      const request: Partial<CreateRatingRequest> = {
        rating: 4,
        review_text: 'Updated review',
      };

      const result = await ratingService.update('123', request);
      expect(result).toEqual(mockUpdatedRating);
      expect(httpClient.put).toHaveBeenCalledWith(
        '/ratings/123',
        expect.anything(),
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      vi.mocked(httpClient.put).mockRejectedValueOnce(error);

      const request: Partial<CreateRatingRequest> = { rating: 3 };

      await expect(ratingService.update('123', request)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('delete', () => {
    it('should delete a rating', async () => {
      vi.mocked(httpClient.del).mockResolvedValueOnce({ success: true });

      const result = await ratingService.delete('123');
      expect(result.success).toBe(true);
      expect(httpClient.del).toHaveBeenCalledWith('/ratings/123');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      vi.mocked(httpClient.del).mockRejectedValueOnce(error);

      await expect(ratingService.delete('123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('getStats', () => {
    it('should retrieve rating statistics for an entity', async () => {
      const mockStats = {
        average: 4.5,
        count: 10,
        distribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 4,
          5: 5,
        },
      };

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockStats);

      const result = await ratingService.getStats('product-1', 'business-1');
      expect(result).toEqual(mockStats);
      expect(httpClient.get).toHaveBeenCalled();
    });

    it('should handle stats retrieval errors', async () => {
      const error = new Error('Stats unavailable');
      vi.mocked(httpClient.get).mockRejectedValueOnce(error);

      await expect(
        ratingService.getStats('product-1', 'business-1'),
      ).rejects.toThrow('Stats unavailable');
    });
  });

  describe('listByEntity', () => {
    it('should list ratings with all methods', async () => {
      const mockRatings: Rating[] = [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          rating: 5,
          review_text: 'Great!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockRatings);

      const result = await ratingService.list();
      expect(Array.isArray(result)).toBe(true);
      expect(httpClient.get).toHaveBeenCalled();
    });
  });
});
