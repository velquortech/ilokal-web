import http from './client';
import type { ApiResponse } from '@/lib/types';

const uploadService = {
  async uploadAvatar(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string }>> {
    return await http.post<ApiResponse<{ url: string }>>(
      '/web/upload/avatar',
      formData,
    );
  },

  async uploadVerificationDocs(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string }>> {
    return await http.post<ApiResponse<{ url: string }>>(
      '/web/upload/verification-docs',
      formData,
    );
  },

  async uploadCouponImage(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string; path: string; fileName: string }>> {
    return await http.post<
      ApiResponse<{ url: string; path: string; fileName: string }>
    >('/web/upload/coupon-image', formData);
  },

  async uploadProductImage(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string; path: string; fileName: string }>> {
    return await http.post<
      ApiResponse<{ url: string; path: string; fileName: string }>
    >('/web/upload/product-image', formData);
  },
};

export default uploadService;
