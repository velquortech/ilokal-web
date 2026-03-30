import http from './client';

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

  async create(data: unknown) {
    return await http.post('/products', data);
  },

  async update(id: string, data: unknown) {
    return await http.put(`/products/${id}`, data);
  },

  async delete(id: string) {
    return await http.del(`/products/${id}`);
  },
};

export default productService;
