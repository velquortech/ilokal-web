import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as q from '@/lib/api/products/productQuery';
import * as svc from '@/lib/api/products/productService';
import {
  mockProduct,
  mockProductOnSale,
  BUSINESS_ID,
  OTHER_BUSINESS_ID,
} from '../../mockData/products.mock';
import { mockCategory } from '../../mockData/categories.mock';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

// ===== applySale =====

describe('applySale()', () => {
  it('returns NOT_FOUND when product does not exist', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      error: 'Product not found',
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 140,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when product belongs to a different business', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, business_id: OTHER_BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 140,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns VALIDATION_ERROR when sale_price >= original price', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, price: 185, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 185,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(res.error?.message).toMatch(/less than/i);
  });

  it('returns VALIDATION_ERROR when sale_price equals original price exactly', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, price: 185, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 185,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns success when sale_price is valid and DB update succeeds', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, price: 185, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    vi.mocked(q.applySaleToProduct).mockResolvedValueOnce({
      product: { ...mockProduct, sale_price: 140 },
    } as unknown as Awaited<ReturnType<typeof q.applySaleToProduct>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 140,
      sale_starts_at: '2026-01-01T00:00:00Z',
      sale_ends_at: '2026-12-31T23:59:59Z',
    });

    expect(res.success).toBe(true);
    expect(res.data?.sale_price).toBe(140);
  });

  it('returns INTERNAL_ERROR when applySaleToProduct fails', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, price: 185, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    vi.mocked(q.applySaleToProduct).mockResolvedValueOnce({
      error: 'DB write failed',
    } as unknown as Awaited<ReturnType<typeof q.applySaleToProduct>>);

    const res = await svc.applySale(mockProduct.id, BUSINESS_ID, {
      sale_price: 100,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== removeSale =====

describe('removeSale()', () => {
  it('returns NOT_FOUND when product does not exist', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      error: 'Product not found',
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.removeSale(mockProductOnSale.id, BUSINESS_ID);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when product belongs to a different business', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProductOnSale, business_id: OTHER_BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const res = await svc.removeSale(mockProductOnSale.id, BUSINESS_ID);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns success and cleared sale fields on valid request', async () => {
    const clearedProduct = {
      ...mockProductOnSale,
      sale_price: null,
      sale_starts_at: null,
      sale_ends_at: null,
      business_id: BUSINESS_ID,
    };
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProductOnSale, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    vi.mocked(q.removeSaleFromProduct).mockResolvedValueOnce({
      product: clearedProduct,
    } as unknown as Awaited<ReturnType<typeof q.removeSaleFromProduct>>);

    const res = await svc.removeSale(mockProductOnSale.id, BUSINESS_ID);

    expect(res.success).toBe(true);
    expect(res.data?.sale_price).toBeNull();
  });

  it('returns INTERNAL_ERROR when removeSaleFromProduct fails', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProductOnSale, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    vi.mocked(q.removeSaleFromProduct).mockResolvedValueOnce({
      error: 'write timeout',
    } as unknown as Awaited<ReturnType<typeof q.removeSaleFromProduct>>);

    const res = await svc.removeSale(mockProductOnSale.id, BUSINESS_ID);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== createCategory — edge cases =====

describe('createCategory() — description handling', () => {
  it('passes null description when description is omitted', async () => {
    vi.mocked(q.getCategoryBySlug).mockResolvedValueOnce(null);

    const { createServerSupabaseClient } = await import('@/supabase/server');
    const insertSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'cat-1', name: 'New', slug: 'new', description: null },
          error: null,
        }),
      })),
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => ({ insert: insertSpy })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    const res = await svc.createCategory({ name: 'New', slug: 'new' });

    expect(res.success).toBe(true);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });
});

// ===== updateProduct — price and field updates =====

describe('updateProduct() — field updates', () => {
  it('returns INTERNAL_ERROR when DB update fails', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);

    const { createServerSupabaseClient } = await import('@/supabase/server');
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'update failed' },
              }),
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    const res = await svc.updateProduct(mockProduct.id, BUSINESS_ID, {
      name: 'New Name',
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('allows updating category to a valid category', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      product: { ...mockProduct, business_id: BUSINESS_ID },
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    vi.mocked(q.getCategoryById).mockResolvedValueOnce(
      mockCategory as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
    );

    const { createServerSupabaseClient } = await import('@/supabase/server');
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...mockProduct, category_id: mockCategory.id },
                error: null,
              }),
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

    const res = await svc.updateProduct(mockProduct.id, BUSINESS_ID, {
      category_id: mockCategory.id,
    });

    expect(res.success).toBe(true);
  });
});
