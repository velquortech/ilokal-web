/**
 * The product-catalogues page must push pagination/filter searchParams into
 * getProductsPaginated (server-side pagination) — not fetch-all. This is the
 * regression net for the "Rows per page does nothing" bug, where the page
 * fetched every product and the client stubbed pagination out.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductCataloguesPage from '@/app/business/[businessId]/product-catalogues/page';
import * as productQuery from '@/lib/api/products/productQuery';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { BUSINESS_ID } from '../../mockData/products.mock';

vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));

vi.mock('@/lib/api/products/productQuery', () => ({
  getProductsPaginated: vi.fn(),
  getProductStatsByBusinessId: vi.fn(),
  getCategoriesPaginated: vi.fn(),
  getCategoryDivergence: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const emptyPage = {
  products: [],
  total: 0,
  page: 1,
  per_page: 10,
  total_pages: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    authorized: true,
    business: { id: BUSINESS_ID },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
  vi.mocked(productQuery.getProductsPaginated).mockResolvedValue(emptyPage);
  vi.mocked(productQuery.getProductStatsByBusinessId).mockResolvedValue({
    total: 0,
    active: 0,
    unlisted: 0,
    disabled: 0,
    on_sale: 0,
  });
  vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValue({
    categories: [],
    total: 0,
    page: 1,
    per_page: 100,
    total_pages: 0,
  });
  vi.mocked(productQuery.getCategoryDivergence).mockResolvedValue({
    businessTypeId: null,
    businessTypeName: null,
    divergent: [],
    failed: false,
  });
});

function params(sp: Record<string, string | string[] | undefined>) {
  return { searchParams: Promise.resolve(sp) };
}

describe('ProductCataloguesPage searchParams passthrough', () => {
  it('forwards page/perPage/search/section/branch to getProductsPaginated', async () => {
    await ProductCataloguesPage(
      params({
        page: '2',
        perPage: '20',
        search: 'latte',
        section: 'sec-1',
        branch: 'branch-1',
      }),
    );

    expect(productQuery.getProductsPaginated).toHaveBeenCalledWith({
      business_id: BUSINESS_ID,
      branch_id: 'branch-1',
      page: 2,
      per_page: 20,
      search: 'latte',
      section_id: 'sec-1',
      status: '',
    });
  });

  it("maps the Uncategorised chip's 'none' straight through", async () => {
    await ProductCataloguesPage(params({ section: 'none' }));

    expect(productQuery.getProductsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: 'none' }),
    );
  });

  it('ignores a stale ?category= param', async () => {
    // The chip strip writes `section` now, and updateParams preserves unknown
    // params — a bookmarked `?category=` would otherwise keep filtering the
    // table with no control able to show or clear it.
    await ProductCataloguesPage(params({ category: 'cat-1' }));

    const args = vi
      .mocked(productQuery.getProductsPaginated)
      .mock.calls.at(-1)?.[0];
    expect(args).not.toHaveProperty('category_id');
  });

  it("defaults to page 1 / perPage 10 / status '' (all statuses)", async () => {
    await ProductCataloguesPage(params({}));

    expect(productQuery.getProductsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 10, status: '' }),
    );
  });

  it('passes through a valid status filter and rejects an invalid one', async () => {
    await ProductCataloguesPage(params({ status: 'unlisted' }));
    expect(productQuery.getProductsPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'unlisted' }),
    );

    await ProductCataloguesPage(params({ status: 'evil' }));
    expect(productQuery.getProductsPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: '' }),
    );
  });

  it('clamps out-of-range pagination values', async () => {
    await ProductCataloguesPage(params({ page: '-3', perPage: '9999' }));

    expect(productQuery.getProductsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 50 }),
    );
  });
});
