/**
 * /explore must push its searchParams into getBusinessDirectory (server-side
 * offset pagination) — regression net so the page can never regress to
 * fetch-all/in-memory filtering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExplorePage from '@/app/explore/page';
import * as customerQuery from '@/lib/api/customer/customerQuery';

vi.mock('@/lib/api/customer/customerQuery', () => ({
  getBusinessDirectory: vi.fn(),
  getCustomerCategories: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(customerQuery.getBusinessDirectory).mockResolvedValue({
    businesses: [],
    metadata: { total: 0, page: 1, per_page: 12, total_pages: 0 },
  });
  vi.mocked(customerQuery.getCustomerCategories).mockResolvedValue([]);
});

function params(sp: Record<string, string | string[] | undefined>) {
  return { searchParams: Promise.resolve(sp) };
}

describe('ExplorePage searchParams passthrough', () => {
  it('forwards page/perPage/search/category', async () => {
    await ExplorePage(
      params({ page: '2', perPage: '18', search: 'cafe', category: 'cat-1' }),
    );

    expect(customerQuery.getBusinessDirectory).toHaveBeenCalledWith({
      page: 2,
      per_page: 18,
      search: 'cafe',
      category_id: 'cat-1',
    });
  });

  it('defaults and clamps out-of-range values', async () => {
    await ExplorePage(params({ page: '-1', perPage: '999' }));

    expect(customerQuery.getBusinessDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 24 }),
    );
  });
});
