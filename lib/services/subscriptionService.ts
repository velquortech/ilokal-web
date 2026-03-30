import http from './client';
import type {
  ApiResponse,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  UpgradeSubscriptionRequest,
  DowngradeSubscriptionRequest,
  CancelSubscriptionRequest,
  CreatePaymentMethodRequest,
  SubscriptionResponse,
  SubscriptionPaymentMethod,
} from '@/lib/types';

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
    data: CreateSubscriptionRequest,
  ): Promise<ApiResponse<SubscriptionResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.createSubscription(businessId, data);
    }

    return await http.post<ApiResponse<SubscriptionResponse>>(
      '/subscriptions',
      Object.assign(
        { business_id: businessId },
        data as Record<string, unknown>,
      ),
    );
  },

  async updateSubscription(
    id: string,
    data: UpdateSubscriptionRequest,
  ): Promise<ApiResponse<SubscriptionResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.updateSubscription(id, data);
    }

    return await http.put<ApiResponse<SubscriptionResponse>>(
      `/subscriptions/${id}`,
      data,
    );
  },

  async upgradeSubscription(
    id: string,
    data: UpgradeSubscriptionRequest,
  ): Promise<ApiResponse<SubscriptionResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.upgradeSubscription(id, data);
    }

    return await http.post<ApiResponse<SubscriptionResponse>>(
      '/subscriptions/upgrade',
      Object.assign({ id }, data as Record<string, unknown>),
    );
  },

  async downgradeSubscription(
    id: string,
    data: DowngradeSubscriptionRequest,
  ): Promise<ApiResponse<SubscriptionResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.downgradeSubscription(id, data);
    }

    return await http.post<ApiResponse<SubscriptionResponse>>(
      '/subscriptions/downgrade',
      Object.assign({ id }, data as Record<string, unknown>),
    );
  },

  async cancelSubscription(
    id: string,
    data: CancelSubscriptionRequest,
  ): Promise<ApiResponse<SubscriptionResponse>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.cancelSubscription(id, data);
    }

    return await http.post<ApiResponse<SubscriptionResponse>>(
      `/subscriptions/${id}/cancel`,
      data,
    );
  },

  async addPaymentMethod(
    businessId: string,
    input: CreatePaymentMethodRequest,
  ): Promise<ApiResponse<SubscriptionPaymentMethod>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.addPaymentMethod(businessId, input);
    }

    return await http.post<ApiResponse<SubscriptionPaymentMethod>>(
      '/billing/payment-method',
      Object.assign(
        { business_id: businessId },
        input as Record<string, unknown>,
      ),
    );
  },

  async removePaymentMethod(
    paymentMethodId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.removePaymentMethod(paymentMethodId);
    }

    return await http.del<ApiResponse<{ message: string }>>(
      `/billing/payment-method/${paymentMethodId}`,
    );
  },

  async setDefaultPaymentMethod(
    businessId: string,
    paymentMethodId: string,
  ): Promise<ApiResponse<SubscriptionPaymentMethod>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      return await client.setDefaultPaymentMethod(businessId, paymentMethodId);
    }

    return await http.put<ApiResponse<SubscriptionPaymentMethod>>(
      `/billing/payment-method/${paymentMethodId}`,
      {
        is_default: true,
        business_id: businessId,
      },
    );
  },
};

export default subscriptionService;
