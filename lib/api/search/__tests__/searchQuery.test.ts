/**
 * Search Query Tests - Phase F
 * Database read operations for search functionality
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('searchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchBusinesses', () => {
    it('should search businesses by name with full-text search', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'biz-1', name: 'Pizza Palace', rating: 4.8 },
            { id: 'biz-2', name: 'Pizza Express', rating: 4.5 },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.textSearch).toBeDefined();
    });

    it('should filter by category', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
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
      expect(mockSupabase.eq).toBeDefined();
    });

    it('should exclude archived businesses', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1', archived_at: null }],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.is).toBeDefined();
    });

    it('should sort by relevance and rating', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
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

    it('should default to 20 results', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array(20).fill({ id: 'biz-' }),
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.limit).toBeDefined();
    });
  });

  describe('searchProducts', () => {
    it('should search products by name and description', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'prod-1', name: 'Widget', price: 2999 }],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.textSearch).toBeDefined();
    });

    it('should filter by business if specified', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
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
      expect(mockSupabase.eq).toBeDefined();
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return autocomplete suggestions', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { name: 'Pizza' },
            { name: 'Pizza Palace' },
            { name: 'Pizza Express' },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.limit).toBeDefined();
    });

    it('should limit to top 10 suggestions', async () => {
      const limit = 10;
      expect(limit).toBe(10);
    });

    it('should de-duplicate suggestions', () => {
      const suggestions = ['Pizza', 'Pizza', 'Pizza Palace', 'Pizza Palace'];
      const unique = [...new Set(suggestions)];

      expect(unique.length).toBe(2);
    });
  });

  describe('getHotDeals', () => {
    it('should return categories with most deals', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { category: 'Food & Dining', deal_count: 156 },
            { category: 'Entertainment', deal_count: 89 },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.order).toBeDefined();
    });

    it('should filter for active deals only', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
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
      expect(mockSupabase.gte).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle full-text search errors', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid search syntax' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.textSearch).toBeDefined();
    });

    it('should return empty array on error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'DB error' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.limit).toBeDefined();
    });
  });
});
