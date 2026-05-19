import http from './client';
import type {
  CreateBranchRequest,
  UpdateBranchRequest,
  Branch,
} from '@/lib/types';

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

  async create(data: CreateBranchRequest) {
    return await http.post<Branch>('/branches', data);
  },

  async update(id: string, data: UpdateBranchRequest) {
    return await http.put<Branch>(`/branches/${id}`, data);
  },

  async delete(id: string) {
    return await http.del(`/branches/${id}`);
  },
};

export default branchService;
