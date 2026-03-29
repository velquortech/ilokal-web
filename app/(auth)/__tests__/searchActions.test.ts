/**
 * Search server actions tests
 * Tests for search actions used in components
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as searchActions from '@/app/(auth)/actions/searchActions';
import * as searchService from '@/lib/api/search/searchService';

vi.mock('@/lib/api/search/searchService');

type GlobalSearchResponse = Awaited<
  ReturnType<typeof searchService.globalSearch>
>;
type BusinessSearchResponse = Awaited<
  ReturnType<typeof searchService.searchBusinessesService>
>;
type ProductSearchResponse = Awaited<
  ReturnType<typeof searchService.searchProductsService>
>;
type DealSearchResponse = Awaited<
  ReturnType<typeof searchService.searchDealsService>
>;
type TrendingResponse = Awaited<
  ReturnType<typeof searchService.getTrendingService>
>;

type BusinessSearchData = NonNullable<BusinessSearchResponse['data']>;
type ProductSearchData = NonNullable<ProductSearchResponse['data']>;
type DealSearchData = NonNullable<DealSearchResponse['data']>;

const createBusinessSearchData = (query = 'test'): BusinessSearchData => ({
  results: [],
  total: 0,
  page: 1,
  per_page: 20,
  total_pages: 0,
  query,
});

const createProductSearchData = (query = 'test'): ProductSearchData => ({
  results: [],
  total: 0,
  page: 1,
  per_page: 20,
  total_pages: 0,
  query,
});

const createDealSearchData = (query = 'test'): DealSearchData => ({
  results: [],
  total: 0,
  page: 1,
  per_page: 20,
  total_pages: 0,
  query,
});

const createGlobalSearchResponse = (query = 'test'): GlobalSearchResponse =>
  ({
    success: true,
    data: {
      query,
      businesses: createBusinessSearchData(query),
      products: createProductSearchData(query),
      deals: createDealSearchData(query),
      total_businesses: 0,
      total_products: 0,
      total_deals: 0,
      pagination: { page: 1, per_page: 20, total: 0 },
    },
  }) as GlobalSearchResponse;

const createBusinessSearchResponse = (
  query = 'test',
): BusinessSearchResponse => ({
  success: true,
  data: createBusinessSearchData(query),
});

const createProductSearchResponse = (
  query = 'test',
): ProductSearchResponse => ({
  success: true,
  data: createProductSearchData(query),
});

const createDealSearchResponse = (query = 'test'): DealSearchResponse => ({
  success: true,
  data: createDealSearchData(query),
});

const createTrendingResponse = (
  period: 'day' | 'week' | 'month' = 'week',
  type: 'all' | 'business' | 'product' | 'deal' = 'all',
): TrendingResponse =>
  ({
    success: true,
    data: {
      period,
      type,
      businesses: [],
      products: [],
      trending: [],
      total: 0,
      generated_at: new Date().toISOString(),
    },
  }) as TrendingResponse;

describe('Search Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('globalSearchAction', () => {
    it('should perform global search', async () => {
      const mockResponse = createGlobalSearchResponse('test');

      vi.mocked(searchService.globalSearch).mockResolvedValueOnce(mockResponse);

      const result = await searchActions.globalSearchAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should trim query and pass default sort', async () => {
      const mockResponse = createGlobalSearchResponse('test');

      vi.mocked(searchService.globalSearch).mockResolvedValueOnce(mockResponse);

      await searchActions.globalSearchAction(
        '  test  ',
        { category: 'retail' },
        { page: 1, per_page: 20 },
      );

      expect(vi.mocked(searchService.globalSearch)).toHaveBeenCalledWith(
        'test',
        { category: 'retail' },
        { page: 1, per_page: 20 },
        'relevance',
      );
    });

    it('should pass custom sort', async () => {
      const mockResponse = createGlobalSearchResponse('test');

      vi.mocked(searchService.globalSearch).mockResolvedValueOnce(mockResponse);

      await searchActions.globalSearchAction(
        'test',
        {},
        { page: 2, per_page: 10 },
        'newest',
      );

      expect(vi.mocked(searchService.globalSearch)).toHaveBeenCalledWith(
        'test',
        {},
        { page: 2, per_page: 10 },
        'newest',
      );
    });

    it('should reject empty query', async () => {
      const result = await searchActions.globalSearchAction('');

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('VALIDATION_ERROR');
      expect(vi.mocked(searchService.globalSearch)).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only query', async () => {
      const result = await searchActions.globalSearchAction('   ');

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('VALIDATION_ERROR');
      expect(vi.mocked(searchService.globalSearch)).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(searchService.globalSearch).mockRejectedValueOnce(
        new Error('Service error'),
      );

      const result = await searchActions.globalSearchAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('searchBusinessesAction', () => {
    it('should search businesses', async () => {
      const mockResponse = createBusinessSearchResponse('test');

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchBusinessesAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should pass filters correctly', async () => {
      const mockResponse = createBusinessSearchResponse('test');

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchBusinessesAction(
        'test',
        { category: 'retail', min_rating: 4 },
        { page: 1, per_page: 20 },
        'rating',
      );

      expect(result.success).toBe(true);
      expect(
        vi.mocked(searchService.searchBusinessesService),
      ).toHaveBeenCalledWith(
        'test',
        { category: 'retail', min_rating: 4 },
        { page: 1, per_page: 20 },
        'rating',
      );
    });

    it('should trim query before calling service', async () => {
      const mockResponse = createBusinessSearchResponse('test');

      vi.mocked(searchService.searchBusinessesService).mockResolvedValueOnce(
        mockResponse,
      );

      await searchActions.searchBusinessesAction(
        '  test  ',
        {},
        { page: 1, per_page: 20 },
      );

      expect(
        vi.mocked(searchService.searchBusinessesService),
      ).toHaveBeenCalledWith(
        'test',
        {},
        { page: 1, per_page: 20 },
        'relevance',
      );
    });

    it('should reject empty query', async () => {
      const result = await searchActions.searchBusinessesAction('');

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('VALIDATION_ERROR');
      expect(
        vi.mocked(searchService.searchBusinessesService),
      ).not.toHaveBeenCalled();
    });
  });

  describe('searchProductsAction', () => {
    it('should search products', async () => {
      const mockResponse = createProductSearchResponse('test');

      vi.mocked(searchService.searchProductsService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchProductsAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should apply price filters', async () => {
      const mockResponse = createProductSearchResponse('test');

      vi.mocked(searchService.searchProductsService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchProductsAction(
        'test',
        { min_price: 1000, max_price: 50000 },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(
        vi.mocked(searchService.searchProductsService),
      ).toHaveBeenCalledWith(
        'test',
        { min_price: 1000, max_price: 50000 },
        { page: 1, per_page: 20 },
        'relevance',
      );
    });

    it('should reject empty query', async () => {
      const result = await searchActions.searchProductsAction('');

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('VALIDATION_ERROR');
      expect(
        vi.mocked(searchService.searchProductsService),
      ).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(searchService.searchProductsService).mockRejectedValueOnce(
        new Error('Service error'),
      );

      const result = await searchActions.searchProductsAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('searchDealsAction', () => {
    it('should search deals', async () => {
      const mockResponse = createDealSearchResponse('test');

      vi.mocked(searchService.searchDealsService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchDealsAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
    });

    it('should filter featured deals', async () => {
      const mockResponse = createDealSearchResponse('test');

      vi.mocked(searchService.searchDealsService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.searchDealsAction(
        'test',
        { is_featured: true },
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(searchService.searchDealsService)).toHaveBeenCalledWith(
        'test',
        { is_featured: true },
        { page: 1, per_page: 20 },
        'relevance',
      );
    });

    it('should reject whitespace-only query', async () => {
      const result = await searchActions.searchDealsAction('   ');

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('VALIDATION_ERROR');
      expect(
        vi.mocked(searchService.searchDealsService),
      ).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(searchService.searchDealsService).mockRejectedValueOnce(
        new Error('Service error'),
      );

      const result = await searchActions.searchDealsAction(
        'test',
        {},
        { page: 1, per_page: 20 },
      );

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getTrendingAction', () => {
    it('should get trending results', async () => {
      const mockResponse = createTrendingResponse('week', 'all');

      vi.mocked(searchService.getTrendingService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.getTrendingAction({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should support different periods', async () => {
      const mockResponse = createTrendingResponse('month', 'product');

      vi.mocked(searchService.getTrendingService).mockResolvedValueOnce(
        mockResponse,
      );

      const result = await searchActions.getTrendingAction({
        period: 'month',
        type: 'product',
        limit: 20,
      });

      expect(result.success).toBe(true);
    });

    it('should pass input to service', async () => {
      const mockResponse = createTrendingResponse('week', 'all');

      vi.mocked(searchService.getTrendingService).mockResolvedValueOnce(
        mockResponse,
      );

      await searchActions.getTrendingAction({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(vi.mocked(searchService.getTrendingService)).toHaveBeenCalledWith({
        period: 'week',
        type: 'all',
        limit: 10,
      });
    });

    it('should handle trending service errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(searchService.getTrendingService).mockRejectedValueOnce(
        new Error('Service error'),
      );

      const result = await searchActions.getTrendingAction({
        period: 'week',
        type: 'all',
        limit: 10,
      });

      expect(result.success).toBe(false);
      expect((result.error as { code: string })?.code).toBe('INTERNAL_ERROR');
    });
  });
});
