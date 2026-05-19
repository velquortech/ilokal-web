import http from './client';
import type { ApiResponse } from '@/lib/types';

interface VerificationStatusData {
  id: string;
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  name: string;
  created_at: string | null;
}

async function useServerClient() {
  const client = await import('@/lib/api/business/businessQuery');
  return client;
}

const businessPublicService = {
  async getVerificationStatus(
    businessId: string,
  ): Promise<ApiResponse<VerificationStatusData | null>> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const { business, error } = await client.getBusinessById(businessId);
      if (error || !business) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: error ?? 'Business not found' },
        };
      }

      return {
        success: true,
        data: {
          id: business.id,
          status: business.status as VerificationStatusData['status'],
          name: business.name,
          created_at: business.created_at ?? null,
        },
      };
    }

    try {
      const res = await http.get<VerificationStatusData>(
        `/businesses/${businessId}/verification-status`,
      );
      return {
        success: true,
        data: res,
      } as ApiResponse<VerificationStatusData>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

export default businessPublicService;
