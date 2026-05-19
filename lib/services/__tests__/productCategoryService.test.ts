import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiResponse } from '@/lib/types';
import type { Category } from '@/lib/types';

vi.mock('@/lib/services/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Import after mock is registered
const { default: http } = await import('@/lib/services/client');
const { default: productCategoryService } =
  await import('@/lib/services/productCategoryService');

interface CategoriesResponse {
  categories: Category[];
  total: number;
}

const mockResponse: ApiResponse<CategoriesResponse> = {
  success: true,
  data: {
    categories: [
      {
        id: 'cat-1',
        name: 'Food & Beverages',
        slug: 'food-beverages',
        description: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    total: 1,
  },
};

describe('productCategoryService.list()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(http.get).mockResolvedValue(mockResponse);
  });

  it('calls /categories with no query string when no params provided', async () => {
    await productCategoryService.list();
    expect(vi.mocked(http.get)).toHaveBeenCalledWith('/categories');
  });

  it('appends search param when provided', async () => {
    await productCategoryService.list({ search: 'food' });
    expect(vi.mocked(http.get)).toHaveBeenCalledWith(
      expect.stringContaining('search=food'),
    );
  });

  it('appends sort_by param when provided', async () => {
    await productCategoryService.list({ sort_by: 'name_desc' });
    expect(vi.mocked(http.get)).toHaveBeenCalledWith(
      expect.stringContaining('sort_by=name_desc'),
    );
  });

  it('appends page and per_page when provided', async () => {
    await productCategoryService.list({ page: 2, per_page: 50 });
    const called = vi.mocked(http.get).mock.calls[0][0] as string;
    expect(called).toContain('page=2');
    expect(called).toContain('per_page=50');
  });

  it('appends multiple params together', async () => {
    await productCategoryService.list({ sort_by: 'newest', per_page: 200 });
    const called = vi.mocked(http.get).mock.calls[0][0] as string;
    expect(called).toContain('sort_by=newest');
    expect(called).toContain('per_page=200');
  });

  it('returns the API response from http.get', async () => {
    const result = await productCategoryService.list();
    expect(result).toEqual(mockResponse);
  });
});
