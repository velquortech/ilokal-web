import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as productQuery from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('productQuery', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };
  let chainedMock: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    chainedMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
      single: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn(() => chainedMock),
    };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createServerSupabaseClient>
      >,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategoriesPaginated()', () => {
    it('should fetch paginated categories without filters', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
        { id: 'cat-2', name: 'Clothing', slug: 'clothing' },
      ];

      chainedMock.range.mockResolvedValue({
        data: mockCategories,
        count: 2,
        error: null,
      });

      const result = await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
      });

      expect(result.categories).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should search categories by name', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
        search: 'electronics',
      });

      expect(chainedMock.or).toHaveBeenCalled();
    });

    it('should sort categories ascending for name_asc', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
        sort_by: 'name_asc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });

    it('should sort categories descending for name_desc', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
        sort_by: 'name_desc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('name', {
        ascending: false,
      });
    });

    it('should sort categories by created_at desc for newest', async () => {
      chainedMock.range.mockResolvedValue({ data: [], count: 0, error: null });

      await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
        sort_by: 'newest',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should handle pagination correctly', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 100,
        error: null,
      });

      const result = await productQuery.getCategoriesPaginated({
        page: 5,
        per_page: 20,
      });

      expect(chainedMock.range).toHaveBeenCalledWith(80, 99);
      expect(result.total).toBe(100);
    });

    it('should handle database error', async () => {
      chainedMock.range.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'DB error' },
      });

      const result = await productQuery.getCategoriesPaginated({
        page: 1,
        per_page: 10,
      });

      expect(result.categories).toHaveLength(0);
      expect(result.error).toContain('DB error');
    });
  });

  describe('getCategoryById()', () => {
    it('should fetch category by ID', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
      };

      chainedMock.single.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const result = await productQuery.getCategoryById('cat-1');

      expect(result).toEqual(mockCategory);
    });

    it('should return null when category not found', async () => {
      chainedMock.single.mockResolvedValue({ data: null, error: null });

      const result = await productQuery.getCategoryById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle error properly', async () => {
      chainedMock.single.mockResolvedValue({
        data: null,
        error: { message: 'Query error' },
      });

      const result = await productQuery.getCategoryById('cat-1');

      expect(result).toBeNull();
    });
  });

  describe('getCategoryBySlug()', () => {
    it('should fetch category by slug', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Electronics',
        slug: 'electronics',
      };

      chainedMock.single.mockResolvedValue({ data: mockCategory, error: null });

      const result = await productQuery.getCategoryBySlug('electronics');

      expect(result).toEqual(mockCategory);
    });

    it('should return null when slug not found', async () => {
      chainedMock.single.mockResolvedValue({ data: null, error: null });

      const result = await productQuery.getCategoryBySlug('nonexistent-slug');

      expect(result).toBeNull();
    });
  });

  describe('getProductsPaginated()', () => {
    it('should fetch paginated products without filters', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', price: 99.99 },
        { id: 'prod-2', name: 'Product 2', price: 49.99 },
      ];

      chainedMock.range.mockResolvedValue({
        data: mockProducts,
        count: 2,
        error: null,
      });

      const result = await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
      });

      // Type assertion for success response
      if ('products' in result) {
        expect(result.products).toHaveLength(2);
        expect(result.total).toBe(2);
      }
    });

    it('should filter products by business ID', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        business_id: 'biz-1',
      });

      expect(chainedMock.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    });

    it('should filter products by category ID', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        business_id: 'biz-1',
        category_id: 'cat-1',
      });

      expect(chainedMock.eq).toHaveBeenCalled();
    });

    it('should filter products by status', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        status: 'active',
      });

      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should search products by name', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        search: 'laptop',
      });

      expect(chainedMock.or).toHaveBeenCalled();
    });

    it('should handle price range filtering', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        min_price: 10,
        max_price: 100,
      });

      expect(chainedMock.gte).toHaveBeenCalledWith('price', 10);
      expect(chainedMock.lte).toHaveBeenCalledWith('price', 100);
    });

    it('should sort products by name', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
        sort_by: 'name_asc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });

    it('should handle pagination correctly with large page', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 500,
        error: null,
      });

      const result = await productQuery.getProductsPaginated({
        page: 10,
        per_page: 50,
      });

      expect(chainedMock.range).toHaveBeenCalledWith(450, 499);
      // Type assertion for success response
      if ('total' in result) {
        expect(result.total).toBe(500);
      }
    });

    it('should handle database error', async () => {
      chainedMock.range.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'DB connection error' },
      });

      const result = await productQuery.getProductsPaginated({
        page: 1,
        per_page: 10,
      });

      if ('error' in result && typeof result.error === 'string') {
        expect(result.error).toContain('DB connection error');
      } else if ('products' in result) {
        expect(result.products).toHaveLength(0);
      }
    });
  });

  describe('getProductsByBusinessId()', () => {
    it('should fetch all products for a business', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Flat White', business_id: 'biz-1' },
        { id: 'p2', name: 'Latte', business_id: 'biz-1' },
      ];

      chainedMock.order.mockResolvedValueOnce({
        data: mockProducts,
        error: null,
      });

      const result = await productQuery.getProductsByBusinessId('biz-1');

      expect(chainedMock.eq).toHaveBeenCalledWith('business_id', 'biz-1');
      if ('products' in result) {
        expect(result.products).toHaveLength(2);
      }
    });

    it('should filter by status when provided', async () => {
      chainedMock.order.mockResolvedValueOnce({ data: [], error: null });

      await productQuery.getProductsByBusinessId('biz-1', 'active');

      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should return error string on DB failure', async () => {
      chainedMock.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'query failed' },
      });

      const result = await productQuery.getProductsByBusinessId('biz-1');

      expect('error' in result).toBe(true);
    });

    it('should order by created_at descending', async () => {
      chainedMock.order.mockResolvedValueOnce({ data: [], error: null });

      await productQuery.getProductsByBusinessId('biz-1');

      expect(chainedMock.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply limit when provided', async () => {
      chainedMock.order.mockResolvedValueOnce({ data: [], error: null });

      await productQuery.getProductsByBusinessId('biz-1', 'active', 10);

      expect(chainedMock.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getProductById()', () => {
    it('should return the product when found', async () => {
      const mockProduct = {
        id: 'p1',
        name: 'Flat White',
        business_id: 'biz-1',
      };
      chainedMock.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null,
      });

      const result = await productQuery.getProductById('p1');

      expect('product' in result).toBe(true);
      if ('product' in result) {
        expect(result.product.id).toBe('p1');
      }
    });

    it('should return error when product not found', async () => {
      chainedMock.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await productQuery.getProductById('missing');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Product not found');
      }
    });
  });
});
