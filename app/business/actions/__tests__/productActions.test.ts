import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { ApiResponse, Product, Category } from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as productQuery from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/products/productQuery');
vi.mock('@/lib/api/products/productService');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import {
  createProductAction,
  getBusinessProductsAction,
  getCategoriesAction,
  uploadProductImageAction,
} from '../productActions';

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440000';

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

describe('createProductAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns VALIDATION_ERROR when name is missing', async () => {
    const res = await createProductAction({
      name: '',
      price: 100,
      category_id: CATEGORY_ID,
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when price is negative', async () => {
    const res = await createProductAction({
      name: 'Test',
      price: -1,
      category_id: CATEGORY_ID,
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when category_id is not a UUID', async () => {
    const res = await createProductAction({
      name: 'Test',
      price: 100,
      category_id: 'not-a-uuid',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await createProductAction({
      name: 'Test',
      price: 100,
      category_id: CATEGORY_ID,
    });
    expect(res.success).toBe(false);
  });

  it('delegates to productService.createProduct and returns success', async () => {
    const mockProduct: Partial<Product> = { id: 'prod-1', name: 'Test', price: 100 };
    const productService = await import('@/lib/api/products/productService');
    vi.mocked(productService.createProduct).mockResolvedValueOnce({
      success: true,
      data: mockProduct as Product,
    });

    const res = await createProductAction({
      name: 'Test',
      price: 100,
      category_id: CATEGORY_ID,
    });
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Product>).data?.name).toBe('Test');
  });
});

describe('getBusinessProductsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessProductsAction();
    expect(res.success).toBe(false);
  });

  it('returns products when authorized and query succeeds', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductsByBusinessId).mockResolvedValueOnce({
      products: [{ id: 'p1', name: 'Test' }],
    } as unknown as Awaited<ReturnType<typeof productQuery.getProductsByBusinessId>>);

    const res = await getBusinessProductsAction();
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Product[]>).data).toHaveLength(1);
  });

  it('returns INTERNAL_ERROR when query returns an error', async () => {
    mockAuthorized();
    vi.mocked(productQuery.getProductsByBusinessId).mockResolvedValueOnce({
      error: 'Failed to fetch business products',
    } as unknown as Awaited<ReturnType<typeof productQuery.getProductsByBusinessId>>);

    const res = await getBusinessProductsAction();
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

describe('getCategoriesAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns categories on success', async () => {
    const mockCats = [{ id: 'cat-1', name: 'Food' }] as Category[];
    vi.mocked(productQuery.getCategoriesPaginated).mockResolvedValueOnce({
      categories: mockCats,
      total: 1,
      page: 1,
      per_page: 200,
      total_pages: 1,
    });

    const res = await getCategoriesAction();
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Category[]>).data).toHaveLength(1);
  });

  it('returns INTERNAL_ERROR when query throws', async () => {
    vi.mocked(productQuery.getCategoriesPaginated).mockRejectedValueOnce(
      new Error('DB error'),
    );

    const res = await getCategoriesAction();
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

describe('uploadProductImageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const fd = new FormData();
    fd.append('file', new File(['data'], 'img.jpg', { type: 'image/jpeg' }));
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(false);
  });

  it('returns VALIDATION_ERROR when no file in FormData', async () => {
    const fd = new FormData();
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when file exceeds 5 MB', async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const fd = new FormData();
    fd.append('file', new File([bigContent], 'big.jpg', { type: 'image/jpeg' }));
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(res.error?.message).toMatch(/5 MB/i);
  });

  it('returns VALIDATION_ERROR for a disallowed file type', async () => {
    const fd = new FormData();
    fd.append('file', new File(['data'], 'doc.pdf', { type: 'application/pdf' }));
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(res.error?.message).toMatch(/JPEG|PNG|GIF|WebP/i);
  });

  it('returns UPLOAD_ERROR when Supabase storage upload fails', async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: { message: 'bucket not found' } }),
          getPublicUrl: vi.fn(),
        })),
      },
    };
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(mockSupabase);

    const fd = new FormData();
    fd.append('file', new File(['data'], 'img.png', { type: 'image/png' }));
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UPLOAD_ERROR');
  });

  it('returns the public URL on a successful upload', async () => {
    const mockSupabase = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: 'https://storage.example.com/img.png' },
          }),
        })),
      },
    };
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(mockSupabase);

    const fd = new FormData();
    fd.append('file', new File(['data'], 'img.png', { type: 'image/png' }));
    const res = await uploadProductImageAction(fd);
    expect(res.success).toBe(true);
    expect((res as ApiResponse<{ url: string }>).data?.url).toBe(
      'https://storage.example.com/img.png',
    );
  });
});
