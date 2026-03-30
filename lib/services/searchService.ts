import http from './client';

const searchService = {
  async global(query: string, params?: Record<string, string | number>) {
    const qs = new URLSearchParams({ q: query } as Record<string, string>);
    if (params)
      Object.entries(params).forEach(([k, v]) => qs.append(k, String(v)));
    return await http.get(`/search?${qs.toString()}`);
  },

  async businesses(query: string, params?: Record<string, string | number>) {
    const qs = new URLSearchParams({ q: query } as Record<string, string>);
    if (params)
      Object.entries(params).forEach(([k, v]) => qs.append(k, String(v)));
    return await http.get(`/search/businesses?${qs.toString()}`);
  },

  async deals(query: string, params?: Record<string, string | number>) {
    const qs = new URLSearchParams({ q: query } as Record<string, string>);
    if (params)
      Object.entries(params).forEach(([k, v]) => qs.append(k, String(v)));
    return await http.get(`/search/deals?${qs.toString()}`);
  },
};

export default searchService;
