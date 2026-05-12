import http from './client';
import type { ApiResponse } from '@/lib/types';

const uploadService = {
  async uploadAvatar(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string }>> {
    return await http.post<ApiResponse<{ url: string }>>(
      '/upload/avatar',
      formData,
    );
  },

  async uploadVerificationDocs(
    formData: FormData,
  ): Promise<ApiResponse<{ url: string }>> {
    return await http.post<ApiResponse<{ url: string }>>(
      '/upload/verification-docs',
      formData,
    );
  },
};

export default uploadService;
