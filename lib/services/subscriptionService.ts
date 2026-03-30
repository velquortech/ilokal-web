import http from './client';

const subscriptionService = {
  async list() {
    return await http.get('/subscriptions');
  },

  async plans() {
    return await http.get('/subscriptions/plans');
  },

  async upgrade(data: unknown) {
    return await http.post('/subscriptions/upgrade', data);
  },

  async downgrade(data: unknown) {
    return await http.post('/subscriptions/downgrade', data);
  },
};

export default subscriptionService;
