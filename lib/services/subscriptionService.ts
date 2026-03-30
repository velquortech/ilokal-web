import http from './client';
import type { ApiResponse } from '@/lib/types';

async function useServerClient() {
  const client = await import('@/lib/api/subscriptions/subscriptionService');
  return client;
}

const subscriptionService = {
  async list() {
    return await http.get('/subscriptions');
  },

  async plans() {
    return await http.get('/subscriptions/plans');
  },

  async createSubscription(
    businessId: string,
    data: unknown,
  ): Promise<unknown> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createSubscription(businessId, data as any);
    }

    return await http.post(
      '/subscriptions',
      Object.assign(
        { business_id: businessId },
        data as Record<string, unknown>,
      ),
    );
  },

  async updateSubscription(id: string, data: unknown): Promise<unknown> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateSubscription(id, data as any);
    }

    return await http.put(`/subscriptions/${id}`, data);
  },

  async upgradeSubscription(id: string, data: unknown): Promise<unknown> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.upgradeSubscription(id, data as any);
    }

    return await http.post(
      '/subscriptions/upgrade',
      Object.assign({ id }, data as Record<string, unknown>),
    );
  },

  async downgradeSubscription(id: string, data: unknown): Promise<unknown> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.downgradeSubscription(id, data as any);
    }

    return await http.post(
      '/subscriptions/downgrade',
      Object.assign({ id }, data as Record<string, unknown>),
    );
  },

  async cancelSubscription(id: string, data: unknown): Promise<unknown> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.cancelSubscription(id, data as any);
    }

    return await http.post(`/subscriptions/${id}/cancel`, data);
  },
};

export default subscriptionService;
