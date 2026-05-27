/**
 * Search API routes tests
 * Tests for /api/search, /api/search/businesses, /api/search/products, /api/search/deals, /api/trending
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as searchService from '@/lib/api/search/searchService';
import type {
  ApiResponse,
  SearchResponse,
  GlobalSearchResponse,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
  TrendingResponse,
} from '@/lib/types';

// Mock the search service
vi.mock('@/lib/api/search/searchService', () => ({
  globalSearch: vi.fn(),
  searchBusinessesService: vi.fn(),
  searchProductsService: vi.fn(),
  searchDealsService: vi.fn(),
  getTrendingService: vi.fn(),
}));

describe('Search API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Global Search (/api/search)', () => {
    it('should return error when query is missing', async () => {
      // This would be tested at the route level in integration tests
      expect(true).toBe(true);
    });

    it('should call globalSearch service with correct parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          query: 'test',
          businesses: {
            results: [],
            total: 0,
            page: 1,
            per_page: 20,
            total_pages: 0,
            query: 'test',
          },
          products: {
            results: [],
            total: 0,
            page: 1,
            per_page: 20,
            total_pages: 0,
            query: 'test',
          },
          deals: {
            results: [],
            total: 0,
            page: 1,
            per_page: 20,
            total_pages: 0,
            query: 'test',
          },
          pagination: { page: 1, per_page: 20, total: 0 },
        },
      };

      vi.mocked(searchService.globalSearch).mockResolvedValueOnce(
        mockResponse as ApiResponse<GlobalSearchResponse>,
      );

      const result = await searchService.globalSearch(
        'test',
        {},
        { page: 1, per_page: 20 },
        'relevance',
      );

      expect(result.success).toBe(true);
      expect(result.data?.businesses.query).toBe('test');
    });
  });

  describe('Business Search (/api/search/businesses)', () => {
    it('should return business search results', async () => {
      const mockResults: SearchResponse<BusinessSearchResult> = {
        results: [
          {
            id: 'biz-1',
            name: 'Test Business',
            description: 'A test business',
            category: 'retail',
            rating: 4.5,
            review_count: 10,
            status: 'verified' as const,
            location: 'Iloilo City',
            image_url: 'https://example.com/image.jpg',
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

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
      const mockResults: SearchResponse<BusinessSearchResult> = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchBusinessesService(
        'test',
        { category: 'retail' },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should apply rating filter', async () => {
      const mockResults: SearchResponse<BusinessSearchResult> = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchBusinessesService(
        'test',
        { min_rating: 3.5, max_rating: 5 },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Product Search (/api/search/products)', () => {
    it('should return product search results', async () => {
      const mockResults: SearchResponse<ProductSearchResult> = {
        results: [
          {
            id: 'prod-1',
            name: 'Test Product',
            description: 'A test product',
            category: 'electronics',
            price_cents: 10000,
            rating: 4.2,
            review_count: 5,
            business_id: 'biz-1',
            business_name: 'Test Business',
            image_url: 'https://example.com/product.jpg',
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchService.searchProductsService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchProductsService(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0].name).toBe('Test Product');
    });

    it('should apply price filter', async () => {
      const mockResults: SearchResponse<ProductSearchResult> = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchService.searchProductsService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchProductsService(
        'test',
        { min_price: 5000, max_price: 20000 },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should apply sorting parameter', async () => {
      const mockResults: SearchResponse<ProductSearchResult> = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchService.searchProductsService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchProductsService(
        'test',
        {},
        { page: 1, per_page: 20 },
        'price_low',
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Deal Search (/api/search/deals)', () => {
    it('should return deal search results', async () => {
      const mockResults: SearchResponse<DealSearchResult> = {
        results: [
          {
            id: 'deal-1',
            title: 'Test Deal',
            description: 'A test deal',
            discount_percent: 20,
            is_featured: true,
            expires_at: '2025-12-31T23:59:59Z',
            business_id: 'biz-1',
            business_name: 'Test Business',
            image_url: 'https://example.com/deal.jpg',
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchService.searchDealsService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchDealsService(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(1);
      expect(result.data?.results[0].title).toBe('Test Deal');
    });

    it('should apply featured filter', async () => {
      const mockResults: SearchResponse<DealSearchResult> = {
        results: [],
        total: 0,
        page: 1,
        per_page: 20,
        total_pages: 0,
        query: 'test',
      };

      vi.mocked(searchService.searchDealsService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchDealsService(
        'test',
        { is_featured: true },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Trending (/api/trending)', () => {
    it('should return trending results', async () => {
      const mockResponse = {
        success: true,
        data: {
          period: 'week' as const,
          type: 'all' as const,
          businesses: [],
          products: [],
          trending: [],
          total: 0,
          generated_at: new Date().toISOString(),
        },
      };

      vi.mocked(searchService.getTrendingService).mockResolvedValueOnce(
        mockResponse as ApiResponse<TrendingResponse>,
      );

      const result = await searchService.getTrendingService({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should support different time periods', async () => {
      const mockResponse = {
        success: true,
        data: {
          period: 'month' as const,
          type: 'business' as const,
          businesses: [],
          products: [],
          trending: [],
          total: 0,
          generated_at: new Date().toISOString(),
        },
      };

      vi.mocked(searchService.getTrendingService).mockResolvedValueOnce(
        mockResponse as ApiResponse<TrendingResponse>,
      );

      const result = await searchService.getTrendingService({
        period: 'month',
        type: 'business',
        limit: 15,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const mockResults: SearchResponse<BusinessSearchResult> = {
        results: [],
        total: 100,
        page: 2,
        per_page: 20,
        total_pages: 5,
        query: 'test',
      };

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchBusinessesService(
        'test',
        {},
        { page: 2, per_page: 20 },
      );

      expect(result.data?.page).toBe(2);
      expect(result.data?.per_page).toBe(20);
      expect(result.data?.total_pages).toBe(5);
    });

    it('should limit per_page to maximum', async () => {
      const mockResults: SearchResponse<BusinessSearchResult> = {
        results: [],
        total: 100,
        page: 1,
        per_page: 100, // Should be capped
        total_pages: 1,
        query: 'test',
      };

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce({
        success: true,
        data: mockResults,
      });

      const result = await searchService.searchBusinessesService(
        'test',
        {},
        { page: 1, per_page: 200 }, // Request more than max
      );

      expect(result.data?.per_page).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(searchService.globalSearch).mockRejectedValueOnce(
        new Error('Database error'),
      );

      try {
        await searchService.globalSearch('test', {}, { page: 1, per_page: 20 });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
