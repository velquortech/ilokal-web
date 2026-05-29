import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { NextRequest } from 'next/server';

// Mocks
vi.mock('@/lib/utils/assertAuthorized', () => ({ assertAuthorized: vi.fn() }));
vi.mock('@/lib/api/payments/paymentQuery', () => ({ getInvoiceById: vi.fn() }));

import { POST as sendInvoice } from '@/app/api/web/invoices/[id]/send/route';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as paymentQuery from '@/lib/api/payments/paymentQuery';

describe('POST /api/invoices/:id/send authorization', () => {
  it('returns 403 when caller is not owner nor admin', async () => {
    (assertAuthorized as Mock).mockResolvedValueOnce({
      authorized: true,
      user: { id: 'user-2' },
      profile: { role: 'user' },
    });

    (paymentQuery.getInvoiceById as Mock).mockResolvedValueOnce({
      invoice: { id: 'inv-1', user_id: 'owner-1' },
    });

    const mockReq = {
      json: async () => ({ recipient_email: 'a@b.com' }),
    } as unknown as NextRequest;

    const res = await sendInvoice(mockReq, {
      params: Promise.resolve({ id: 'inv-1' }),
    } as unknown as { params: Promise<{ id: string }> });
    // NextResponse.json returns a Response-like object; inspect success field
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status).toBe(403);
  });
});
