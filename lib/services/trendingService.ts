import http from './client';
import type { ApiResponse } from '@/lib/types';

const trendingService = {
  async get(options?: { period?: string; type?: string; limit?: number }) {
    const qs = options
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(options).map(([k, v]) => [k, String(v ?? '')]),
          ),
        )}`
      : '';

    try {
      const res = await http.get(`/trending${qs}`);
      return { success: true, data: res } as ApiResponse<unknown>;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      } as ApiResponse;
    }
  },
};

export default trendingService;
