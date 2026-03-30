import http from './client';

const uploadService = {
  async uploadAvatar(formData: unknown) {
    return await http.post('/upload/avatar', formData);
  },

  async uploadVerificationDocs(formData: unknown) {
    return await http.post('/upload/verification-docs', formData);
  },
};

export default uploadService;
