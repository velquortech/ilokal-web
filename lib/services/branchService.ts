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

  async create(data: unknown) {
    return await http.post('/branches', data);
  },

  async update(id: string, data: unknown) {
    return await http.put(`/branches/${id}`, data);
  },

  async delete(id: string) {
    return await http.del(`/branches/${id}`);
  },
};

export default branchService;
