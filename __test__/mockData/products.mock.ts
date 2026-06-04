import type {
  Product,
  ProductResponse,
  PaginatedProductsResponse,
} from '@/lib/types';
import { mockCategory, mockCategoryClothing } from './categories.mock';

export const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
export const OTHER_BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000002';

export const mockProduct: Product = {
  id: 'prod-00000000-0000-0000-0000-000000000001',
  business_id: BUSINESS_ID,
  branch_id: null,
  category_id: mockCategory.id,
  name: 'Flat White',
  description: 'Smooth espresso with steamed milk',
  price: 185,
  price_type: 'fixed',
  price_unit: null,
  image_url: 'https://picsum.photos/seed/flatwhite/200/200',
  is_available: true,
  status: 'active',
  sale_price: null,
  sale_starts_at: null,
  sale_ends_at: null,
  archived_at: null,
  created_at: '2026-01-10T08:00:00Z',
  updated_at: '2026-01-10T08:00:00Z',
};

export const mockProductOnSale: Product = {
  id: 'prod-00000000-0000-0000-0000-000000000002',
  business_id: BUSINESS_ID,
  branch_id: null,
  category_id: mockCategory.id,
  name: 'Cappuccino',
  description: 'Classic Italian coffee',
  price: 160,
  price_type: 'fixed',
  price_unit: null,
  image_url: 'https://picsum.photos/seed/cappuccino/200/200',
  is_available: true,
  status: 'active',
  sale_price: 130,
  sale_starts_at: '2026-01-01T00:00:00Z',
  sale_ends_at: '2026-12-31T23:59:59Z',
  archived_at: null,
  created_at: '2026-01-10T09:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

export const mockProductInactive: Product = {
  id: 'prod-00000000-0000-0000-0000-000000000003',
  business_id: BUSINESS_ID,
  branch_id: null,
  category_id: mockCategoryClothing.id,
  name: 'Cotton T-Shirt',
  description: 'Basic cotton tee',
  price: 350,
  price_type: 'fixed',
  price_unit: null,
  image_url: null,
  is_available: false,
  status: 'unlisted',
  sale_price: null,
  sale_starts_at: null,
  sale_ends_at: null,
  archived_at: null,
  created_at: '2026-01-11T08:00:00Z',
  updated_at: '2026-01-11T08:00:00Z',
};

export const mockProductArchived: Product = {
  id: 'prod-00000000-0000-0000-0000-000000000004',
  business_id: BUSINESS_ID,
  branch_id: null,
  category_id: mockCategory.id,
  name: 'Old Brew',
  description: 'Discontinued item',
  price: 100,
  price_type: 'fixed',
  price_unit: null,
  image_url: null,
  is_available: false,
  status: 'disabled',
  sale_price: null,
  sale_starts_at: null,
  sale_ends_at: null,
  archived_at: '2026-02-01T00:00:00Z',
  created_at: '2026-01-05T08:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
};

export const mockProductPerHour: Product = {
  id: 'prod-00000000-0000-0000-0000-000000000005',
  business_id: BUSINESS_ID,
  branch_id: null,
  category_id: mockCategoryClothing.id,
  name: 'Sewing Lesson',
  description: 'Private tailoring lesson',
  price: 500,
  price_type: 'per_hour',
  price_unit: 'session',
  image_url: null,
  is_available: true,
  status: 'active',
  sale_price: null,
  sale_starts_at: null,
  sale_ends_at: null,
  archived_at: null,
  created_at: '2026-01-12T08:00:00Z',
  updated_at: '2026-01-12T08:00:00Z',
};

export const mockProductResponse: ProductResponse = {
  ...mockProduct,
  category: mockCategory,
};

export const mockProductOnSaleResponse: ProductResponse = {
  ...mockProductOnSale,
  category: mockCategory,
};

export const mockProducts: Product[] = [
  mockProduct,
  mockProductOnSale,
  mockProductInactive,
];

export const mockActiveProducts: Product[] = [mockProduct, mockProductOnSale];

export const paginatedProductsResponse: PaginatedProductsResponse = {
  products: [mockProductResponse, mockProductOnSaleResponse],
  total: 2,
  page: 1,
  per_page: 10,
  total_pages: 1,
};

export const mockProductStats = {
  total: 4,
  active: 2,
  unlisted: 1,
  disabled: 1,
};

export const mockMobileProduct = {
  id: mockProduct.id,
  name: mockProduct.name,
  description: mockProduct.description,
  price: mockProduct.price,
  price_type: mockProduct.price_type,
  price_unit: mockProduct.price_unit,
  image_url: mockProduct.image_url,
  is_available: mockProduct.is_available,
  average_rating: 4.5,
  rating_count: 10,
};
