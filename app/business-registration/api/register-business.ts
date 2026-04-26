import apiClient from '@/services/api/apiClient';

export async function registerBusiness(formData: FormData) {
  return await apiClient.post('/api/businesses', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
}
