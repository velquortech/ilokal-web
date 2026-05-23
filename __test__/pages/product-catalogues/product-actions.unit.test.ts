import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiResponse, Product } from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as productQuery from '@/lib/api/products/productQuery';
import {
  mockProduct,
  mockProductOnSale,
  mockProductStats,
  paginatedProductsResponse,
  BUSINESS_ID,
} from '../../mockData/products.mock';
import { paginatedCategoriesResponse } from '../../mockData/categories.mock';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/products/productQuery');
vi.mock('@/lib/api/products/productService');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import {
  updateProductAction,
  deleteProductAction,
  applySaleAction,
  removeSaleAction,
  getBusinessProductsPaginatedAction,
  getBusinessProductStatsAction,
  getCategoriesAction,
} from '@/app/business/[businessId]/actions/productActions';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  user: { id: 'user-1' },
};

const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

function mockAuthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    authorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}

function mockUnauthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    unauthorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}

// ===== updateProductAction =====

describe('updateProductAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns VALIDATION_ERROR when name is empty string', async () => {
    const res = await updateProductAction(mockProduct.id, { name: '' });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when price is negative', async () => {
    const res = await updateProductAction(mockProduct.id, { price: -10 });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await updateProductAction(mockProduct.id, { name: 'New Name' });

    expect(res.success).toBe(false);
  });

  it('delegates to productService.updateProduct and returns success', async () => {
    const updatedProduct: Partial<Product> = {
      ...mockProduct,
      name: 'New Name',
    };
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.updateProduct).mockResolvedValueOnce({
      success: true,
      data: updatedProduct as Product,
    });

    const res = await updateProductAction(mockProduct.id, { name: 'New Name' });

    expect(res.success).toBe(true);
    expect((res as ApiResponse<Product>).data?.name).toBe('New Name');
  });

  it('returns INTERNAL_ERROR when service throws', async () => {
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.updateProduct).mockRejectedValueOnce(
      new Error('unexpected'),
    );

    const res = await updateProductAction(mockProduct.id, { name: 'X' });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== deleteProductAction =====

describe('deleteProductAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await deleteProductAction(mockProduct.id);

    expect(res.success).toBe(false);
  });

  it('returns success when product is archived successfully', async () => {
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.deleteProduct).mockResolvedValueOnce({
      success: true,
      data: null,
    });

    const res = await deleteProductAction(mockProduct.id);

    expect(res.success).toBe(true);
    expect(res.data).toBeNull();
  });

  it('returns service error when product not found', async () => {
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.deleteProduct).mockResolvedValueOnce({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });

    const res = await deleteProductAction('nonexistent-id');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });
});

// ===== applySaleAction =====

describe('applySaleAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns VALIDATION_ERROR when sale_price is missing', async () => {
    const res = await applySaleAction(
      mockProduct.id,
      {} as Parameters<typeof applySaleAction>[1],
    );

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when sale_price is negative', async () => {
    const res = await applySaleAction(mockProduct.id, { sale_price: -10 });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await applySaleAction(mockProduct.id, { sale_price: 140 });

    expect(res.success).toBe(false);
  });

  it('delegates to productService.applySale and returns success', async () => {
    const saleProduct: Partial<Product> = { ...mockProduct, sale_price: 140 };
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.applySale).mockResolvedValueOnce({
      success: true,
      data: saleProduct as Product,
    });

    const res = await applySaleAction(mockProduct.id, { sale_price: 140 });

    expect(res.success).toBe(true);
    expect((res as ApiResponse<Product>).data?.sale_price).toBe(140);
  });
});

// ===== removeSaleAction =====

describe('removeSaleAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await removeSaleAction(mockProductOnSale.id);

    expect(res.success).toBe(false);
  });

  it('returns success when sale is removed', async () => {
    const clearedProduct: Partial<Product> = {
      ...mockProductOnSale,
      sale_price: null,
    };
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.removeSale).mockResolvedValueOnce({
      success: true,
      data: clearedProduct as Product,
    });

    const res = await removeSaleAction(mockProductOnSale.id);

    expect(res.success).toBe(true);
    expect((res as ApiResponse<Product>).data?.sale_price).toBeNull();
  });

  it('returns service error when product not found', async () => {
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.removeSale).mockResolvedValueOnce({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });

    const res = await removeSaleAction('missing-id');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });
});

// ===== getBusinessProductsPaginatedAction =====

describe('getBusinessProductsPaginatedAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await getBusinessProductsPaginatedAction({
      page: 1,
      per_page: 10,
    });

    expect(res.success).toBe(false);
  });

  it('returns paginated products when authorized and query succeeds', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductsPaginated).mockResolvedValueOnce(
      paginatedProductsResponse,
    );

    const res = await getBusinessProductsPaginatedAction({
      page: 1,
      per_page: 10,
    });

    expect(res.success).toBe(true);
    expect(res.data?.products).toHaveLength(2);
  });

  it('injects business_id from auth context into filter', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductsPaginated).mockResolvedValueOnce(
      paginatedProductsResponse,
    );

    await getBusinessProductsPaginatedAction({ page: 1, per_page: 10 });

    expect(vi.mocked(productQuery.getProductsPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: BUSINESS_ID }),
    );
  });

  it('returns INTERNAL_ERROR when query returns an error', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductsPaginated).mockResolvedValueOnce({
      error: 'DB failed',
    });

    const res = await getBusinessProductsPaginatedAction({
      page: 1,
      per_page: 10,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== getBusinessProductStatsAction =====

describe('getBusinessProductStatsAction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();

    const res = await getBusinessProductStatsAction();

    expect(res.success).toBe(false);
  });

  it('returns stats when authorized and query succeeds', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductStatsByBusiness).mockResolvedValueOnce(
      mockProductStats,
    );

    const res = await getBusinessProductStatsAction();

    expect(res.success).toBe(true);
    expect(res.data?.total).toBe(4);
    expect(res.data?.active).toBe(2);
    expect(res.data?.inactive).toBe(1);
    expect(res.data?.archived).toBe(1);
  });

  it('calls getProductStatsByBusiness with business_id from auth', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductStatsByBusiness).mockResolvedValueOnce(
      mockProductStats,
    );

    await getBusinessProductStatsAction();

    expect(
      vi.mocked(productQuery.getProductStatsByBusiness),
    ).toHaveBeenCalledWith(BUSINESS_ID);
  });
});

// ===== getCategoriesAction — edge cases =====

describe('getCategoriesAction() — edge cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all categories when query succeeds', async () => {
    vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValueOnce(
      paginatedCategoriesResponse,
    );

    const res = await getCategoriesAction();

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(3);
  });

  it('requests per_page=200 to fetch all categories at once', async () => {
    vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValueOnce(
      paginatedCategoriesResponse,
    );

    await getCategoriesAction();

    expect(vi.mocked(productQuery.getCategoriesPaginated)).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 200 }),
    );
  });

  it('returns empty array when no categories exist', async () => {
    vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValueOnce({
      categories: [],
      total: 0,
      page: 1,
      per_page: 200,
      total_pages: 0,
    });

    const res = await getCategoriesAction();

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(0);
  });
});
