import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
  },
}));

import http from '../client';
import paymentsPublicService from '../paymentsPublicService';

describe('paymentsPublicService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('checkout posts to /payments/checkout and returns session', async () => {
    const mock = { id: 'cs_1', url: 'https://checkout' };
    (http.post as unknown as Mock).mockResolvedValue(mock);
    const res = await paymentsPublicService.checkout({
      amount: 100,
      currency: 'PHP',
      payment_method: 'card',
    });
    expect(http.post).toHaveBeenCalledWith(
      '/payments/checkout',
      expect.any(Object),
    );
    expect(res).toEqual({ success: true, data: mock });
  });
});
