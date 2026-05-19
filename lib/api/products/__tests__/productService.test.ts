import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as q from '@/lib/api/products/productQuery';
import * as svc from '@/lib/api/products/productService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/api/products/productQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('productService', () => {
  beforeEach(() => vi.clearAllMocks());

  // ===== Category Service =====

  describe('createCategory()', () => {
    it('returns CONFLICT when slug already exists', async () => {
      vi.mocked(q.getCategoryBySlug).mockResolvedValueOnce(
        { id: 'cat-1', name: 'Existing', slug: 'food' } as unknown as Awaited<ReturnType<typeof q.getCategoryBySlug>>,
      );

      const res = await svc.createCategory({ name: 'Food', slug: 'food' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('CONFLICT');
    });

    it('returns success when slug is unique and insert works', async () => {
      vi.mocked(q.getCategoryBySlug).mockResolvedValueOnce(null);

      const mockCategory = { id: 'cat-1', name: 'Food', slug: 'food' };
      const supabaseClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: mockCategory, error: null })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createCategory({ name: 'Food', slug: 'food' });
      expect(res.success).toBe(true);
      expect(res.data?.slug).toBe('food');
    });

    it('returns INTERNAL_ERROR when DB insert fails', async () => {
      vi.mocked(q.getCategoryBySlug).mockResolvedValueOnce(null);

      const supabaseClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: { message: 'DB error' } })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createCategory({ name: 'Food', slug: 'food' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('updateCategory()', () => {
    it('returns NOT_FOUND when category does not exist', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(null);

      const res = await svc.updateCategory('cat-1', { name: 'New Name' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('returns CONFLICT when new slug already taken by another category', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        { id: 'cat-1', slug: 'food', name: 'Food' } as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      vi.mocked(q.getCategoryBySlug).mockResolvedValueOnce(
        { id: 'cat-2', slug: 'drinks', name: 'Drinks' } as unknown as Awaited<ReturnType<typeof q.getCategoryBySlug>>,
      );

      const res = await svc.updateCategory('cat-1', { slug: 'drinks' });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('CONFLICT');
    });

    it('succeeds when category exists and update works', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        { id: 'cat-1', slug: 'food', name: 'Food' } as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );

      const updatedCategory = { id: 'cat-1', name: 'Updated Food', slug: 'food' };
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: updatedCategory, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.updateCategory('cat-1', { name: 'Updated Food' });
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('Updated Food');
    });
  });

  describe('deleteCategory()', () => {
    it('returns NOT_FOUND when category does not exist', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(null);

      const res = await svc.deleteCategory('cat-1');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('returns CONFLICT when category has products', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        { id: 'cat-1', name: 'Food', slug: 'food' } as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      vi.mocked(q.getProductsByCategory).mockResolvedValueOnce(
        [{ id: 'p1', name: 'Latte' }] as unknown as Awaited<ReturnType<typeof q.getProductsByCategory>>,
      );

      const res = await svc.deleteCategory('cat-1');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('CONFLICT');
    });

    it('succeeds when category is empty', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        { id: 'cat-1', name: 'Food', slug: 'food' } as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      vi.mocked(q.getProductsByCategory).mockResolvedValueOnce([]);

      const supabaseClient = {
        from: vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.deleteCategory('cat-1');
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
    });
  });

  // ===== Product Service =====

  describe('createProduct()', () => {
    it('returns VALIDATION_ERROR for negative price', async () => {
      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Test',
        price: -5,
      } as unknown as Parameters<typeof svc.createProduct>[1]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for price of zero', async () => {
      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Test',
        price: 0,
      } as unknown as Parameters<typeof svc.createProduct>[1]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND when category missing', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        null as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Test',
        price: 10,
      } as unknown as Parameters<typeof svc.createProduct>[1]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('succeeds with defaults when price_type and is_available are omitted', async () => {
      const mockCategory = { id: 'c1', name: 'Cat' };
      const mockProduct = {
        id: 'p1',
        name: 'Test',
        business_id: 'b1',
        price_type: 'fixed',
        is_available: true,
      };
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        mockCategory as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockProduct, error: null })),
        })),
      }));
      const supabaseClient = {
        from: vi.fn(() => ({ insert: insertSpy })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Test',
        price: 10,
      } as unknown as Parameters<typeof svc.createProduct>[1]);

      expect(res.success).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ price_type: 'fixed', is_available: true }),
      );
    });

    it('passes custom price_type and price_unit through to insert', async () => {
      const mockCategory = { id: 'c1', name: 'Cat' };
      const mockProduct = {
        id: 'p1',
        name: 'Lesson',
        business_id: 'b1',
        price_type: 'per_hour',
        price_unit: 'session',
      };
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        mockCategory as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockProduct, error: null })),
        })),
      }));
      const supabaseClient = {
        from: vi.fn(() => ({ insert: insertSpy })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Lesson',
        price: 500,
        price_type: 'per_hour',
        price_unit: 'session',
      } as unknown as Parameters<typeof svc.createProduct>[1]);

      expect(res.success).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ price_type: 'per_hour', price_unit: 'session' }),
      );
    });

    it('passes is_available: false through to insert', async () => {
      const mockCategory = { id: 'c1', name: 'Cat' };
      const mockProduct = { id: 'p1', name: 'Draft', business_id: 'b1', is_available: false };
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        mockCategory as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );

      const insertSpy = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: mockProduct, error: null })),
        })),
      }));
      const supabaseClient = {
        from: vi.fn(() => ({ insert: insertSpy })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Draft',
        price: 100,
        is_available: false,
      } as unknown as Parameters<typeof svc.createProduct>[1]);

      expect(res.success).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ is_available: false }),
      );
    });

    it('returns INTERNAL_ERROR when DB insert fails', async () => {
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        { id: 'c1', name: 'Cat' } as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      const supabaseClient = {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: { message: 'DB error' } })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.createProduct('b1', {
        category_id: 'c1',
        name: 'Test',
        price: 10,
      } as unknown as Parameters<typeof svc.createProduct>[1]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('updateProduct()', () => {
    it('returns AUTHORIZATION_ERROR when product belongs to a different business', async () => {
      const dbRes = { product: { id: 'p1', business_id: 'b-other' } };
      vi.mocked(q.getProductById).mockResolvedValueOnce(
        dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
      );
      const res = await svc.updateProduct('p1', 'b1', {
        name: 'x',
      } as unknown as Parameters<typeof svc.updateProduct>[2]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
    });

    it('returns NOT_FOUND when new category does not exist', async () => {
      const dbRes = { product: { id: 'p1', business_id: 'b1' } };
      vi.mocked(q.getProductById).mockResolvedValueOnce(
        dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
      );
      vi.mocked(q.getCategoryById).mockResolvedValueOnce(
        null as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
      );
      const res = await svc.updateProduct('p1', 'b1', {
        category_id: 'c2',
      } as unknown as Parameters<typeof svc.updateProduct>[2]);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('succeeds when product is authorized and update works', async () => {
      const dbRes = { product: { id: 'p1', business_id: 'b1' } };
      vi.mocked(q.getProductById).mockResolvedValueOnce(
        dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
      );
      const updatedProduct = { id: 'p1', name: 'Updated', business_id: 'b1' };
      const supabaseClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: updatedProduct, error: null })),
              })),
            })),
          })),
        })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.updateProduct('p1', 'b1', {
        name: 'Updated',
      } as unknown as Parameters<typeof svc.updateProduct>[2]);
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('Updated');
    });
  });

  describe('deleteProduct()', () => {
    it('returns NOT_FOUND when product does not exist', async () => {
      vi.mocked(q.getProductById).mockResolvedValueOnce({
        error: 'not found',
      } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
      const res = await svc.deleteProduct('p1', 'b1');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('returns AUTHORIZATION_ERROR when product belongs to a different business', async () => {
      const dbRes = { product: { id: 'p1', business_id: 'b-other' } };
      vi.mocked(q.getProductById).mockResolvedValueOnce(
        dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
      );
      const res = await svc.deleteProduct('p1', 'b1');
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
    });

    it('archives the product (sets status to archived) on success', async () => {
      const dbRes = { product: { id: 'p1', business_id: 'b1' } };
      vi.mocked(q.getProductById).mockResolvedValueOnce(
        dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
      );
      const updateSpy = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const supabaseClient = {
        from: vi.fn(() => ({ update: updateSpy })),
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(supabaseClient);

      const res = await svc.deleteProduct('p1', 'b1');
      expect(res.success).toBe(true);
      expect(res.data).toBeNull();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'archived' }),
      );
    });
  });

  // ===== Legacy flat tests (kept for backwards compatibility) =====

  it('createProduct returns validation error for negative price', async () => {
    const res = await svc.createProduct('b1', {
      category_id: 'c1',
      name: 'Test',
      price: -5,
    } as unknown as Parameters<typeof svc.createProduct>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('createProduct returns not_found when category missing', async () => {
    vi.mocked(q.getCategoryById).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
    );
    const res = await svc.createProduct('b1', {
      category_id: 'c1',
      name: 'Test',
      price: 10,
    } as unknown as Parameters<typeof svc.createProduct>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('createProduct succeeds when category exists and insert works', async () => {
    const mockCategory = { id: 'c1', name: 'Cat' };
    const mockProduct = { id: 'p1', name: 'Test', business_id: 'b1' };
    vi.mocked(q.getCategoryById).mockResolvedValueOnce(
      mockCategory as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
    );

    const supabaseClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: mockProduct, error: null })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.createProduct('b1', {
      category_id: 'c1',
      name: 'Test',
      price: 10,
    } as unknown as Parameters<typeof svc.createProduct>[1]);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(mockProduct);
  });

  it('updateProduct returns authorization error when business mismatch', async () => {
    const dbRes = { product: { id: 'p1', business_id: 'b-other' } };
    vi.mocked(q.getProductById).mockResolvedValueOnce(
      dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
    );
    const res = await svc.updateProduct('p1', 'b1', {
      name: 'x',
    } as unknown as Parameters<typeof svc.updateProduct>[2]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('updateProduct returns not_found when new category not found', async () => {
    const dbRes = { product: { id: 'p1', business_id: 'b1' } };
    vi.mocked(q.getProductById).mockResolvedValueOnce(
      dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
    );
    vi.mocked(q.getCategoryById).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof q.getCategoryById>>,
    );
    const res = await svc.updateProduct('p1', 'b1', {
      category_id: 'c2',
    } as unknown as Parameters<typeof svc.updateProduct>[2]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('deleteProduct returns not_found when product missing', async () => {
    vi.mocked(q.getProductById).mockResolvedValueOnce({
      error: 'not found',
    } as unknown as Awaited<ReturnType<typeof q.getProductById>>);
    const res = await svc.deleteProduct('p1', 'b1');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('deleteProduct succeeds when product belongs to business and archive works', async () => {
    const dbRes = { product: { id: 'p1', business_id: 'b1' } };
    vi.mocked(q.getProductById).mockResolvedValueOnce(
      dbRes as unknown as Awaited<ReturnType<typeof q.getProductById>>,
    );

    const supabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.deleteProduct('p1', 'b1');
    expect(res.success).toBe(true);
  });
});
