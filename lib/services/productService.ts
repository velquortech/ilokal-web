import http from './client';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  Product,
} from '@/lib/types';

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

  async create(data: CreateProductRequest) {
    return await http.post<Product>('/products', data);
  },

  async update(id: string, data: UpdateProductRequest) {
    return await http.put<Product>(`/products/${id}`, data);
  },

  async delete(id: string) {
    return await http.del(`/products/${id}`);
  },
};

export default productService;
