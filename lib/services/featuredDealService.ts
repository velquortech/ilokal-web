import http from './client';

const featuredDealService = {
  async list(params?: Record<string, string | number>) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/featured-deals${qs}`);
  },

  async get(id: string) {
    return await http.get(`/featured-deals/${id}`);
  },
};

export default featuredDealService;
