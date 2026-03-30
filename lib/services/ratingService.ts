import http from './client';

const ratingService = {
  async get(id: string) {
    return await http.get(`/ratings/${id}`);
  },
};

export default ratingService;
