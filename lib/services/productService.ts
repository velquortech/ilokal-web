import http from './client';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  Product,
} from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/products/productService');
  return client;
}

const productService = {
  async list(params?: Record<string, string | number>) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/products${qs}`);
  },

  async get(id: string) {
    return await http.get(`/products/${id}`);
  },

  async create(data: CreateProductRequest & { business_id: string }) {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createProduct(data.business_id, data);
    }

    return await http.post<Product>('/products', data);
  },

  async update(
    id: string,
    data: UpdateProductRequest & { business_id?: string },
  ) {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateProduct(id, data.business_id as string, data);
    }

    return await http.put<Product>(`/products/${id}`, data);
  },

  async delete(id: string) {
    if (typeof window === 'undefined') {
      const [svcClient, userMod, subQ] = await Promise.all([
        useServerClient(),
        import('@/lib/api/getCurrentUser'),
        import('@/lib/api/subscriptions/subscriptionQuery'),
      ]);

      const user = await userMod.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        } as unknown as Product;
      }

      const businessResult = await subQ.getUserBusiness(user.id);
      if ('error' in businessResult) {
        return {
          success: false,
          error: businessResult.error,
        } as unknown as Product;
      }

      return await svcClient.deleteProduct(id, businessResult.data.id);
    }

    return await http.del(`/products/${id}`);
  },
};

export default productService;
