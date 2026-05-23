import type { Category } from '@/lib/types';

export const mockCategory: Category = {
  id: 'cat-00000000-0000-0000-0000-000000000001',
  name: 'Food & Beverages',
  slug: 'food-beverages',
  description: 'Ready-to-eat food and drinks',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const mockCategoryClothing: Category = {
  id: 'cat-00000000-0000-0000-0000-000000000002',
  name: 'Clothing & Apparel',
  slug: 'clothing-apparel',
  description: 'Shirts, pants, and fashion items',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

export const mockCategoryElectronics: Category = {
  id: 'cat-00000000-0000-0000-0000-000000000003',
  name: 'Electronics',
  slug: 'electronics',
  description: 'Gadgets and electronic devices',
  created_at: '2026-01-03T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
};

export const mockCategories: Category[] = [
  mockCategory,
  mockCategoryClothing,
  mockCategoryElectronics,
];

export const paginatedCategoriesResponse = {
  categories: mockCategories,
  total: 3,
  page: 1,
  per_page: 10,
  total_pages: 1,
};
