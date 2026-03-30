import http from './client';

const notificationService = {
  async list() {
    return await http.get('/notifications');
  },

  async get(id: string) {
    return await http.get(`/notifications/${id}`);
  },

  async preferences() {
    return await http.get('/notifications/preferences');
  },
};

export default notificationService;
