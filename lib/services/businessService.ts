import http from './client';
import type { OperationResult } from '@/lib/api/business/businessAPIClient';
import type {
  PaginatedBusinessResponse,
  AdminBusiness,
} from '@/lib/types/business';

async function useServerClient() {
  const client = await import('@/lib/api/business/businessAPIClient');
  return client;
}

const businessService = {
  async list(
    filters?: Partial<Record<string, unknown>>,
  ): Promise<OperationResult<PaginatedBusinessResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.getBusinessesList(filters as any);
    }

    try {
      const res = await http.get('/admin/businesses');
      return { data: res as PaginatedBusinessResponse };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async get(id: string): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.getBusiness(id);
    }

    try {
      const res = await http.get(`/admin/businesses/${id}`);
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async verify(
    businessId: string,
    notes?: string,
  ): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.verifyBusiness(businessId, notes);
    }

    try {
      const res = await http.post(`/admin/businesses/${businessId}/verify`, {
        notes,
      });
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async reject(
    businessId: string,
    reason?: string,
  ): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.rejectBusiness(businessId, reason);
    }

    try {
      const res = await http.post(`/admin/businesses/${businessId}/reject`, {
        reason,
      });
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async suspend(
    businessId: string,
    reason?: string,
  ): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.suspendBusiness(businessId, reason);
    }

    try {
      const res = await http.post(`/admin/businesses/${businessId}/suspend`, {
        reason,
      });
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async reactivate(
    businessId: string,
  ): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.reactivateBusiness(businessId);
    }

    try {
      const res = await http.post(`/admin/businesses/${businessId}/reactivate`);
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async update(
    businessId: string,
    updates: Partial<Record<string, string | number | boolean>>,
  ): Promise<OperationResult<AdminBusiness>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateBusiness(businessId, updates as any);
    }

    try {
      const res = await http.put(`/admin/businesses/${businessId}`, updates);
      return { data: res as AdminBusiness };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async archive(businessId: string): Promise<OperationResult<void>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.archiveBusiness(businessId);
    }

    try {
      await http.del(`/admin/businesses/${businessId}`);
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async deletePermanently(businessId: string): Promise<OperationResult<void>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.deleteBusinessPermanently(businessId);
    }

    try {
      await http.del(`/admin/businesses/${businessId}/permanent`);
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default businessService;
