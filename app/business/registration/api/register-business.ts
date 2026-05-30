import apiClient from '@/services/api/apiClient';

export async function registerBusiness(formData: FormData) {
  return await apiClient.post('/api/web/businesses', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
}
