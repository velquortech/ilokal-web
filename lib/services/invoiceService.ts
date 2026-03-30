import http from './client';
import { PaginatedInvoicesResponse } from '@/lib/types/payment';

const invoiceService = {
  async list(page = 1, limit = 20, filters?: Record<string, string>) {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => params.append(k, v));
    }

    const url = `/billing/invoices?${params.toString()}`;
    return await http.get<PaginatedInvoicesResponse>(url);
  },

  async get(id: string) {
    return await http.get(`/billing/invoices/${id}`);
  },

  async sendInvoice(id: string) {
    return await http.post(`/billing/invoices/${id}/send`);
  },
};

export default invoiceService;
