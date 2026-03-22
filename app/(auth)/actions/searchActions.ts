/**
 * Server actions for search functionality
 * Used by components to perform searches
 */

'use server';

import type { ApiResponse } from '@/lib/types';
import * as searchService from '@/lib/api/search/searchService';
import type {
  SearchFiltersInput,
  PaginationParams,
  TrendingQueryInput,
} from '@/lib/validation/search';

/**
 * Search all types (businesses, products, deals)
 */
export async function globalSearchAction(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
) {
  try {
    if (!query || !query.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query required',
        },
      } as ApiResponse<null>;
    }

    const result = await searchService.globalSearch(
      query.trim(),
      filters,
      pagination,
      sortBy,
    );

    return result;
  } catch (error) {
    console.error('[globalSearchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform search',
      },
    } as ApiResponse<null>;
  }
}

/**
 * Search businesses only
 */
export async function searchBusinessesAction(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
) {
  try {
    if (!query || !query.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query required',
        },
      } as ApiResponse<null>;
    }

    const result = await searchService.searchBusinessesService(
      query.trim(),
      filters,
      pagination,
      sortBy,
    );

    return result;
  } catch (error) {
    console.error('[searchBusinessesAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search businesses',
      },
    } as ApiResponse<null>;
  }
}

/**
 * Search products only
 */
export async function searchProductsAction(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
) {
  try {
    if (!query || !query.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query required',
        },
      } as ApiResponse<null>;
    }

    const result = await searchService.searchProductsService(
      query.trim(),
      filters,
      pagination,
      sortBy,
    );

    return result;
  } catch (error) {
    console.error('[searchProductsAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search products',
      },
    } as ApiResponse<null>;
  }
}

/**
 * Search deals only
 */
export async function searchDealsAction(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
) {
  try {
    if (!query || !query.trim()) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query required',
        },
      } as ApiResponse<null>;
    }

    const result = await searchService.searchDealsService(
      query.trim(),
      filters,
      pagination,
      sortBy,
    );

    return result;
  } catch (error) {
    console.error('[searchDealsAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search deals',
      },
    } as ApiResponse<null>;
  }
}

/**
 * Get trending items
 */
export async function getTrendingAction(input: TrendingQueryInput) {
  try {
    const result = await searchService.getTrendingService(input);
    return result;
  } catch (error) {
    console.error('[getTrendingAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch trending results',
      },
    } as ApiResponse<null>;
  }
}
