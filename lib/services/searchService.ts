import http from './client';
import type {
  ApiResponse,
  GlobalSearchResponse,
  SearchResponse,
  TrendingResponse,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
} from '@/lib/types';
import type {
  SearchFiltersInput,
  PaginationParams,
  TrendingQueryInput,
} from '@/lib/validation/search';

async function useServerClient() {
  const client = await import('@/lib/api/search/searchService');
  return client;
}

const searchService = {
  async globalSearch(
    query: string,
    filters?: SearchFiltersInput,
    pagination?: PaginationParams,
    sortBy: string = 'relevance',
  ): Promise<ApiResponse<GlobalSearchResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.globalSearch(query, filters, pagination, sortBy);
    }

    try {
      const res = await http.post<GlobalSearchResponse>(`/search/global`, {
        query,
        filters,
        pagination,
        sortBy,
      });
      return { success: true, data: res } as ApiResponse<GlobalSearchResponse>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async searchBusinessesService(
    query: string,
    filters?: SearchFiltersInput,
    pagination?: PaginationParams,
    sortBy: string = 'relevance',
  ): Promise<ApiResponse<SearchResponse<BusinessSearchResult>>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.searchBusinessesService(
        query,
        filters,
        pagination,
        sortBy,
      );
    }

    try {
      const res = await http.post<SearchResponse<BusinessSearchResult>>(
        `/search/businesses`,
        {
          query,
          filters,
          pagination,
          sortBy,
        },
      );
      return { success: true, data: res } as ApiResponse<
        SearchResponse<BusinessSearchResult>
      >;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async searchProductsService(
    query: string,
    filters?: SearchFiltersInput,
    pagination?: PaginationParams,
    sortBy: string = 'relevance',
  ): Promise<ApiResponse<SearchResponse<ProductSearchResult>>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.searchProductsService(
        query,
        filters,
        pagination,
        sortBy,
      );
    }

    try {
      const res = await http.post<SearchResponse<ProductSearchResult>>(
        `/search/products`,
        {
          query,
          filters,
          pagination,
          sortBy,
        },
      );
      return { success: true, data: res } as ApiResponse<
        SearchResponse<ProductSearchResult>
      >;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async searchDealsService(
    query: string,
    filters?: SearchFiltersInput,
    pagination?: PaginationParams,
    sortBy: string = 'relevance',
  ): Promise<ApiResponse<SearchResponse<DealSearchResult>>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.searchDealsService(
        query,
        filters,
        pagination,
        sortBy,
      );
    }

    try {
      const res = await http.post<SearchResponse<DealSearchResult>>(
        `/search/deals`,
        {
          query,
          filters,
          pagination,
          sortBy,
        },
      );
      return { success: true, data: res } as ApiResponse<
        SearchResponse<DealSearchResult>
      >;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },

  async getTrendingService(
    input: TrendingQueryInput,
  ): Promise<ApiResponse<TrendingResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.getTrendingService(input);
    }

    try {
      const res = await http.post(`/search/trending`, input);
      return { success: true, data: res } as ApiResponse<TrendingResponse>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
  async getSuggestions(query: string, limit: number = 10) {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.getSuggestions(query, limit);
    }

    try {
      const res = await http.get(
        `/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`,
      );
      return { success: true, data: res } as ApiResponse<{
        suggestions: string[];
      }>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

export default searchService;
