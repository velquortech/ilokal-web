/**
 * Product Domain Types
 * All product-related TypeScript types and interfaces
 */

export type ProductStatus = 'active' | 'inactive' | 'archived';
export type PriceType =
  | 'fixed'
  | 'from'
  | 'per_hour'
  | 'per_day'
  | 'per_person'
  | 'per_event';
export type ProductSortOrder =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'price_low'
  | 'price_high';

// ===== Base Types =====

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  price_type: PriceType;
  price_unit: string | null;
  image_url: string | null;
  is_available: boolean;
  status: ProductStatus;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

// ===== Request/Response Types =====

export type CreateProductRequest = {
  name: string;
  description?: string;
  price: number;
  price_type?: PriceType;
  price_unit?: string;
  category_id: string;
  image_url?: string;
  is_available?: boolean;
};

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  status?: ProductStatus;
};

export type ApplySaleRequest = {
  sale_price: number;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

export type ProductResponse = Product & {
  category?: Category;
};

export type PaginatedProductsResponse = {
  products: ProductResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type CreateCategoryRequest = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

// ===== Filter Types =====

export type ProductFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  status?: ProductStatus;
  business_id?: string;
  sort_by?: ProductSortOrder;
  min_price?: number;
  max_price?: number;
};

export type CategoryFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
};

// ===== Error Types =====

export type ProductError =
  | 'PRODUCT_NOT_FOUND'
  | 'CATEGORY_NOT_FOUND'
  | 'BUSINESS_NOT_FOUND'
  | 'INVALID_PRICE'
  | 'PRODUCT_NAME_REQUIRED'
  | 'CATEGORY_REQUIRED'
  | 'UNAUTHORIZED'
  | 'DUPLICATE_CATEGORY_SLUG'
  | 'INTERNAL_ERROR';
