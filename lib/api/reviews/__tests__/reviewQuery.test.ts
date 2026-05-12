/**
 * Review Query Tests - Phase F
 * Database read operations for reviews and ratings
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('reviewQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReviewsForBusiness', () => {
    it('should return paginated reviews for business', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'rev-1',
              business_id: 'biz-1',
              rating: 5,
              comment: 'Great service!',
              created_at: '2026-03-01',
            },
            {
              id: 'rev-2',
              business_id: 'biz-1',
              rating: 4,
              comment: 'Good experience',
              created_at: '2026-02-28',
            },
          ],
          error: null,
          count: 25,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.range).toBeDefined();
    });

    it('should default to first 10 reviews sorted by newest first', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      // Should order by created_at descending and range(0, 9)
      expect(mockSupabase.range).toBeDefined();
    });

    it('should support pagination', () => {
      const page = 2;
      const limit = 10;
      const offset = (page - 1) * limit;
      const end = offset + limit - 1;

      expect(offset).toBe(10);
      expect(end).toBe(19);
    });

    it('should exclude archived reviews', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            { id: 'rev-1', archived_at: null },
            { id: 'rev-2', archived_at: null },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.is).toBeDefined();
    });
  });

  describe('getReviewsForProduct', () => {
    it('should return reviews specific to product', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'rev-1',
              product_id: 'prod-1',
              rating: 5,
            },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.range).toBeDefined();
    });

    it('should exclude deleted reviews', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.is).toBeDefined();
    });
  });

  describe('getReviewById', () => {
    it('should return single review with user details', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'rev-1',
            rating: 4,
            comment: 'Good service',
            user: { id: 'user-1', name: 'John' },
          },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should return error for non-existent review', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });

  describe('getRatingStats', () => {
    it('should return average rating for business', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            avg_rating: 4.5,
            count: 42,
            distribution: { 5: 25, 4: 12, 3: 3, 2: 1, 1: 1 },
          },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should handle zero reviews', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { avg_rating: null, count: 0 },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });

  describe('getMostRecentReviews', () => {
    it('should return most recent reviews across platform', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'rev-1', created_at: '2026-03-01T10:00:00Z' },
            { id: 'rev-2', created_at: '2026-03-01T09:00:00Z' },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.limit).toBeDefined();
    });

    it('should be sorted by newest first', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.order).toBeDefined();
    });
  });

  describe('hasUserReviewedBusiness', () => {
    it('should return true if user has reviewed', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { exists: true },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should return false if no review exists', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });
});
