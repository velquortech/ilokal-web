import http from './client';

const categoryService = {
  async list() {
    return await http.get('/categories');
  },
};

export default categoryService;
