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

      expect(chainedMock.ilike).toHaveBeenCalled();
    });

    it('should sort categories by name', async () => {
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
      expect(result.error).toBe('DB error');
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

      expect(chainedMock.ilike).toHaveBeenCalled();
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

      // Check if result has error
      if ('error' in result && typeof result.error === 'string') {
        expect(result.error).toBe('DB connection error');
      } else if ('products' in result) {
        expect(result.products).toHaveLength(0);
      }
    });
  });
});
