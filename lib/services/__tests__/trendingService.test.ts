import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
  },
}));

import http from '../client';
import trendingService from '../trendingService';

describe('trendingService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('get calls /trending with qs and returns data', async () => {
    const mock = { items: [] };
    (http.get as unknown as Mock).mockResolvedValue(mock);
    const res = await trendingService.get({
      period: 'week',
      type: 'all',
      limit: 10,
    });
    expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/trending'));
    expect(res).toEqual({ success: true, data: mock });
  });
});
