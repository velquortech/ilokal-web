import http from './client';

const branchService = {
  async list() {
    return await http.get('/branches');
  },

  async get(id: string) {
    return await http.get(`/branches/${id}`);
  },

  async forBusiness(businessId: string) {
    return await http.get(`/branches/business/${businessId}`);
  },
};

export default branchService;
