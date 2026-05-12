import http from './client';
import type { Rating, CreateRatingRequest, RatingStats } from '@/lib/types';

const ratingService = {
  async create(payload: CreateRatingRequest) {
    return await http.post<Rating>('/ratings', payload);
  },

  async get(id: string) {
    return await http.get<Rating>(`/ratings/${id}`);
  },

  async list(filters?: {
    product_id?: string;
    business_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.product_id) params.append('product_id', filters.product_id);
    if (filters?.business_id) params.append('business_id', filters.business_id);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    const query = params.toString();
    return await http.get<Rating[]>(`/ratings${query ? `?${query}` : ''}`);
  },

  async update(id: string, payload: Partial<CreateRatingRequest>) {
    return await http.put<Rating>(`/ratings/${id}`, payload);
  },

  async delete(id: string) {
    return await http.del<{ success: boolean }>(`/ratings/${id}`);
  },

  async getStats(productId?: string, businessId?: string) {
    const params = new URLSearchParams();
    if (productId) params.append('product_id', productId);
    if (businessId) params.append('business_id', businessId);
    const query = params.toString();
    return await http.get<RatingStats>(
      `/ratings/stats${query ? `?${query}` : ''}`,
    );
  },
};

export default ratingService;
