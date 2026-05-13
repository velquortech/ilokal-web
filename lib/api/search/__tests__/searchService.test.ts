/**
 * Search service tests
 * Tests for search service business logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as searchService from '@/lib/api/search/searchService';
import * as searchQuery from '@/lib/api/search/searchQuery';
import type {
  SearchResponse,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
  TrendingResult,
} from '@/lib/types';

// Mock the search query layer
vi.mock('@/lib/api/search/searchQuery');

describe('Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('globalSearch', () => {
    it('should combine results from all search types', async () => {
      const businessMock = {
        results: [
          {
            id: 'biz-1',
            name: 'Test Business',
            description: null,
            category: 'retail',
            rating: 4.5,
            review_count: 10,
            status: 'verified' as const,
            location: 'Iloilo City',
            image_url: null,
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      const productMock = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      const dealMock = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(
        businessMock as SearchResponse<BusinessSearchResult>,
      );
      vi.mocked(searchQuery.searchProducts).mockResolvedValueOnce(
        productMock as SearchResponse<ProductSearchResult>,
      );
      vi.mocked(searchQuery.searchDeals).mockResolvedValueOnce(
        dealMock as SearchResponse<DealSearchResult>,
      );

      const result = await searchService.globalSearch(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.businesses).toBeDefined();
      expect(result.data?.products).toBeDefined();
      expect(result.data?.deals).toBeDefined();
    });

    it('should handle query service errors', async () => {
      vi.mocked(searchQuery.searchBusinesses).mockRejectedValueOnce(
        new Error('DB Error'),
      );

      const result = await searchService.globalSearch(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('searchBusinessesService', () => {
    it('should return formatted business results', async () => {
      const mockResults = {
        results: [
          {
            id: 'biz-1',
            name: 'Test Business',
            description: 'Test description',
            category: 'retail',
            rating: 4.5,
            review_count: 10,
            status: 'verified' as const,
            location: 'Iloilo City',
            image_url: null,
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(
        mockResults as SearchResponse<BusinessSearchResult>,
      );

      const result = await searchService.searchBusinessesService(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0].name).toBe('Test Business');
    });

    it('should apply category filter', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(
        mockResults as SearchResponse<BusinessSearchResult>,
      );

      const result = await searchService.searchBusinessesService(
        'test',
        { category: 'retail' },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should apply rating filters', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(
        mockResults as SearchResponse<BusinessSearchResult>,
      );

      const result = await searchService.searchBusinessesService(
        'test',
        { min_rating: 3.5, max_rating: 5 },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should apply sorting', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(
        mockResults as SearchResponse<BusinessSearchResult>,
      );

      const result = await searchService.searchBusinessesService(
        'test',
        {},
        { page: 1, per_page: 20 },
        'rating',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('searchProductsService', () => {
    it('should return formatted product results', async () => {
      const mockResults = {
        results: [
          {
            id: 'prod-1',
            name: 'Test Product',
            description: 'Test product',
            category: 'electronics',
            price_cents: 10000,
            rating: 4.2,
            review_count: 5,
            business_id: 'biz-1',
            business_name: 'Test Business',
            image_url: null,
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchQuery.searchProducts).mockResolvedValueOnce(
        mockResults as SearchResponse<ProductSearchResult>,
      );

      const result = await searchService.searchProductsService(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
    });

    it('should apply price filters', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchProducts).mockResolvedValueOnce(
        mockResults as SearchResponse<ProductSearchResult>,
      );

      const result = await searchService.searchProductsService(
        'test',
        { min_price: 5000, max_price: 50000 },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('searchDealsService', () => {
    it('should return formatted deal results', async () => {
      const mockResults = {
        results: [
          {
            id: 'deal-1',
            title: 'Test Deal',
            description: 'Test deal',
            discount_percent: 20,
            is_active: true,
            is_featured: false,
            business_id: 'biz-1',
            business_name: 'Test Business',
            profiles: { name: 'Test Business' },
            image_url: null,
            created_at: '2025-01-01T00:00:00Z',
            expires_at: '2025-12-31T23:59:59Z',
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchQuery.searchDeals).mockResolvedValueOnce(
        mockResults as SearchResponse<DealSearchResult>,
      );

      const result = await searchService.searchDealsService(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
    });

    it('should filter featured deals', async () => {
      const mockResults = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchQuery.searchDeals).mockResolvedValueOnce(
        mockResults as SearchResponse<DealSearchResult>,
      );

      const result = await searchService.searchDealsService(
        'test',
        { is_featured: true },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getTrendingService', () => {
    it('should return trending results', async () => {
      const mockTrending = [
        {
          id: 'biz-1',
          type: 'business' as const,
          name: 'Trending Business',
          description: 'Popular business',
          trend_score: 50,
          view_count: 1000,
          engagement_count: 100,
        },
      ];

      vi.mocked(searchQuery.getTrending).mockResolvedValueOnce(
        mockTrending as TrendingResult[],
      );

      const result = await searchService.getTrendingService({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data?.trending).toBeDefined();
    });

    it('should support different time periods', async () => {
      const mockTrending: TrendingResult[] = [];

      vi.mocked(searchQuery.getTrending).mockResolvedValueOnce(
        mockTrending as TrendingResult[],
      );

      const result = await searchService.getTrendingService({
        period: 'month',
        type: 'business',
        limit: 20,
      });

      expect(result.success).toBe(true);
    });

    it('should handle trending service errors', async () => {
      vi.mocked(searchQuery.getTrending).mockRejectedValueOnce(
        new Error('DB Error'),
      );

      const result = await searchService.getTrendingService({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });
});
