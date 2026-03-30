import http from './client';

const reviewService = {
  async list(params?: Record<string, string | number>) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/reviews${qs}`);
  },

  async get(id: string) {
    return await http.get(`/reviews/${id}`);
  },

  async businessReviews(
    businessId: string,
    params?: Record<string, string | number>,
  ) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/reviews/business/${businessId}${qs}`);
  },

  async productReviews(
    productId: string,
    params?: Record<string, string | number>,
  ) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/reviews/product/${productId}${qs}`);
  },
};

export default reviewService;
