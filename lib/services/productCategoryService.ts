import http from './client';
import type { ApiResponse, Category } from '@/lib/types';

interface GetCategoriesParams {
  search?: string;
  sort_by?: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
  page?: number;
  per_page?: number;
}

interface CategoriesResponse {
  categories: Category[];
  total: number;
}

const productCategoryService = {
  async list(
    params?: GetCategoriesParams,
  ): Promise<ApiResponse<CategoriesResponse>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));

    const qs = query.toString();
    return await http.get<ApiResponse<CategoriesResponse>>(
      `/categories${qs ? `?${qs}` : ''}`,
    );
  },
};

export default productCategoryService;
