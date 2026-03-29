/**
 * Search service layer - Business logic
 * Handles search, filtering, and trending operations
 */

import type {
  ApiResponse,
  SearchResponse,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
  GlobalSearchResponse,
  TrendingResponse,
} from '@/lib/types';
import type {
  SearchFiltersInput,
  PaginationParams,
  TrendingQueryInput,
} from '@/lib/validation/search';
import * as searchQuery from './searchQuery';

/**
 * Global search across all types
 */
export async function globalSearch(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<ApiResponse<GlobalSearchResponse>> {
  try {
    // Execute searches in parallel
    const [businesses, products, deals] = await Promise.all([
      searchQuery.searchBusinesses(query, filters, pagination, sortBy),
      searchQuery.searchProducts(query, filters, pagination, sortBy),
      searchQuery.searchDeals(query, filters, pagination, sortBy),
    ]);

    return {
      success: true,
      data: {
        businesses,
        products,
        deals,
      },
    };
  } catch (error) {
    console.error('[globalSearch]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform global search',
      },
    };
  }
}

/**
 * Search businesses only
 */
export async function searchBusinessesService(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<ApiResponse<SearchResponse<BusinessSearchResult>>> {
  try {
    const results = await searchQuery.searchBusinesses(
      query,
      filters,
      pagination,
      sortBy,
    );

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('[searchBusinessesService]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search businesses',
      },
    };
  }
}

/**
 * Search products only
 */
export async function searchProductsService(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<ApiResponse<SearchResponse<ProductSearchResult>>> {
  try {
    const results = await searchQuery.searchProducts(
      query,
      filters,
      pagination,
      sortBy,
    );

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('[searchProductsService]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search products',
      },
    };
  }
}

/**
 * Search deals only
 */
export async function searchDealsService(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<ApiResponse<SearchResponse<DealSearchResult>>> {
  try {
    const results = await searchQuery.searchDeals(
      query,
      filters,
      pagination,
      sortBy,
    );

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('[searchDealsService]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search deals',
      },
    };
  }
}

/**
 * Get trending businesses and products
 */
export async function getTrendingService(
  input: TrendingQueryInput,
): Promise<ApiResponse<TrendingResponse>> {
  try {
    const trending = await searchQuery.getTrending(
      input.period,
      input.type,
      input.limit,
    );

    return {
      success: true,
      data: {
        trending,
        period: input.period,
        total: trending.length,
      },
    };
  } catch (error) {
    console.error('[getTrendingService]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch trending results',
      },
    };
  }
}

/**
 * Get simple autocomplete/suggestions for query
 */
export async function getSuggestions(
  query: string,
  limit: number = 10,
): Promise<ApiResponse<{ suggestions: string[] }>> {
  try {
    if (!query || !query.trim()) {
      return { success: true, data: { suggestions: [] } };
    }

    // Reuse query layer to fetch small result sets
    const [bizResults, prodResults] = await Promise.all([
      searchQuery.searchBusinesses(
        query,
        undefined,
        { page: 1, per_page: limit },
        'relevance',
      ),
      searchQuery.searchProducts(
        query,
        undefined,
        { page: 1, per_page: limit },
        'relevance',
      ),
    ]);

    const names = new Set<string>();
    bizResults.results.forEach((b) => b.name && names.add(b.name));
    prodResults.results.forEach((p) => p.name && names.add(p.name));

    const suggestions = Array.from(names).slice(0, limit);

    return { success: true, data: { suggestions } };
  } catch (error) {
    console.error('[getSuggestions]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get suggestions' },
    };
  }
}
