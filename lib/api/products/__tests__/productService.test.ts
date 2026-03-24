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
