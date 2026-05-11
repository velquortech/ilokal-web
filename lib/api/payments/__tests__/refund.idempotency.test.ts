import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock paymentQuery
vi.mock('@/lib/api/payments/paymentQuery', () => ({
  getPaymentById: vi.fn(),
}));

import * as paymentQuery from '@/lib/api/payments/paymentQuery';
import { refundPayment } from '@/lib/api/payments/paymentService';

describe('refundPayment idempotency', () => {
  it('returns success when payment already canceled', async () => {
    (paymentQuery.getPaymentById as Mock).mockResolvedValueOnce({
      payment: { id: 'pay-1', status: 'refunded' },
    });

    const res = await refundPayment('pay-1');
    expect(res.success).toBe(true);
    expect(res.data).toBeNull();
  });

  it('rejects non-succeeded payments (other than canceled)', async () => {
    (paymentQuery.getPaymentById as Mock).mockResolvedValueOnce({
      payment: { id: 'pay-2', status: 'pending' },
    });

    const res = await refundPayment('pay-2');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });
});
