import http from './client';

const businessService = {
  async get(id: string) {
    return await http.get(`/businesses/${id}/verification-status`);
  },
};

export default businessService;
