import http from './client';
import type {
  ApiResponse,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/products/productService');
  return client;
}

const categoryService = {
  async create(input: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createCategory(input);
    }

    try {
      const res = await http.post('/categories', input);
      return res as ApiResponse<Category>;
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

  async update(
    id: string,
    input: UpdateCategoryRequest,
  ): Promise<ApiResponse<Category>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateCategory(id, input);
    }

    try {
      const res = await http.put(`/categories/${id}`, input);
      return res as ApiResponse<Category>;
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

  async delete(id: string): Promise<ApiResponse<null>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.deleteCategory(id);
    }

    try {
      const res = await http.del(`/categories/${id}`);
      return res as ApiResponse<null>;
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

export default categoryService;
