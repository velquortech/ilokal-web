import http from './client';

const couponService = {
  async list() {
    return await http.get('/coupons');
  },

  async get(id: string) {
    return await http.get(`/coupons/${id}`);
  },
};

export default couponService;
