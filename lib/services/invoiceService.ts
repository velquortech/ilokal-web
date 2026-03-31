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

    if (typeof window === 'undefined') {
      try {
        const [pq, userMod] = await Promise.all([
          import('@/lib/api/payments/paymentQuery'),
          import('@/lib/api/getCurrentUser'),
        ]);
        const user = await userMod.getCurrentUser();
        if (!user) {
          return {
            invoices: [],
            error: 'AUTHENTICATION_ERROR',
          } as unknown as PaginatedInvoicesResponse;
        }
        return await pq.getInvoices(user.id, {
          page,
          limit,
          ...(filters || {}),
        } as any);
      } catch (err) {
        console.error('[invoiceService.list] server fast-path error', err);
        return await http.get<PaginatedInvoicesResponse>(url);
      }
    }

    return await http.get<PaginatedInvoicesResponse>(url);
  },

  async get(id: string) {
    if (typeof window === 'undefined') {
      try {
        const pq = await import('@/lib/api/payments/paymentQuery');
        return await pq.getInvoiceById(id);
      } catch (err) {
        console.error('[invoiceService.get] server fast-path error', err);
        return await http.get(`/billing/invoices/${id}`);
      }
    }

    return await http.get(`/billing/invoices/${id}`);
  },

  async sendInvoice(id: string) {
    if (typeof window === 'undefined') {
      try {
        const svc = await import('@/lib/api/payments/paymentService');
        return await svc.sendInvoiceEmail(id, '');
      } catch (err) {
        console.error(
          '[invoiceService.sendInvoice] server fast-path error',
          err,
        );
        return await http.post(`/billing/invoices/${id}/send`);
      }
    }

    return await http.post(`/billing/invoices/${id}/send`);
  },
};

export default invoiceService;
