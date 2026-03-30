import http from './client';

const paymentService = {
  async get(id: string) {
    return await http.get(`/payments/${id}`);
  },

  async confirm(id: string) {
    return await http.post(`/payments/${id}/confirm`);
  },

  async refund(id: string) {
    return await http.post(`/payments/${id}/refund`);
  },

  async analytics(params?: Record<string, string | number>) {
    const qs = params
      ? `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
      : '';
    return await http.get(`/payments/analytics${qs}`);
  },
};

export default paymentService;
