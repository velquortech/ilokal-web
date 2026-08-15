/**
 * Product Domain Types
 * All product-related TypeScript types and interfaces
 */

import type { OfferingAttributes, OfferingKind } from './offering';

export type ProductStatus = 'active' | 'unlisted' | 'disabled';

/**
 * Runtime mirror of `ProductStatus` — pins the DB CHECK
 * (`20260526000013_fix_products_status_constraint.sql`).
 */
export const PRODUCT_STATUSES = [
  'active',
  'unlisted',
  'disabled',
] as const satisfies readonly ProductStatus[];

/**
 * The single source for every status picker: the row-action submenu, the
 * filter popover and the update dialog. They previously each spelled the trio
 * out, and the row-action menu drifted to `inactive`/`archived` — values the
 * CHECK rejects, so every status change from the table silently 23514'd.
 *
 * `description` matters because `unlisted` and `disabled` are indistinguishable
 * from their names alone: `sync_product_availability` sets
 * `is_available = (status = 'active')`, so BOTH hide the offering from mobile
 * and the public menu. The difference is intent — unlisted is temporary, and
 * `deleteProduct` uses `disabled` (plus `archived_at`) as its soft delete.
 */
export const PRODUCT_STATUS_OPTIONS: ReadonlyArray<{
  value: ProductStatus;
  label: string;
  description: string;
}> = [
  {
    value: 'active',
    label: 'Active',
    description: 'Visible to customers and on the app.',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Hidden from customers. Kept in your catalogue.',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Switched off. Nothing can be booked or bought.',
  },
];

export type PriceType =
  | 'fixed'
  | 'from'
  | 'per_hour'
  | 'per_day'
  | 'per_person'
  | 'per_event'
  /** Quote-based: `price` is NULL and the UI reads "Price on request". */
  | 'on_request';

/** Runtime mirror of `PriceType` — pins the DB enum, drives pickers. */
export const PRICE_TYPES = [
  'fixed',
  'from',
  'per_hour',
  'per_day',
  'per_person',
  'per_event',
  'on_request',
] as const satisfies readonly PriceType[];

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
  /**
   * Vertical this category is pinned to; NULL = global (offered to every
   * shop). Read off the row so a picker can scope "this vertical OR global"
   * and the write path can re-check the same rule server-side.
   */
  business_type_id?: string | null;
  /**
   * Kind this category is offered for; NULL = either (the fail-open default).
   * Mirrors `products.kind` — lets the picker hide product categories while a
   * 'both' business is adding a service, and the write path re-check it.
   */
  kind?: OfferingKind | null;
};

export type Product = {
  id: string;
  business_id: string;
  branch_id: string | null;
  category_id: string | null;
  /** Owner's own grouping. NULL = Uncategorised. See lib/types/section.ts. */
  section_id: string | null;
  /** Product vs service — see `lib/types/offering.ts`. Defaults to `'product'`. */
  kind: OfferingKind;
  name: string;
  description: string | null;
  /** NULL only when `price_type === 'on_request'` (DB CHECK enforces it). */
  price: number | null;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  price_type: PriceType;
  price_unit: string | null;
  image_url: string | null;
  status: ProductStatus;
  is_available: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
} & OfferingAttributes;

// ===== Request/Response Types =====

export type CreateProductRequest = {
  name: string;
  /**
   * Set explicitly by the form from `defaultKindForMode(offering_mode)`.
   * Omitted ⇒ the DB default `'product'`.
   */
  kind?: OfferingKind;
  description?: string;
  /** Omit / null only for `price_type: 'on_request'`. */
  price?: number | null;
  sale_price?: number | null;
  price_type?: PriceType;
  price_unit?: string | null;
  category_id?: string | null;
  section_id?: string | null;
  image_url?: string | null;
  is_available?: boolean;
  branch_id?: string | null;
} & Partial<OfferingAttributes>;

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  status?: ProductStatus;
  branch_id?: string | null;
};

export type ApplySaleRequest = {
  sale_price: number;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

export type ProductResponse = Product & {
  category?: Category | null;
  /** Embedded shop section (id + name only) — see lib/types/section.ts. */
  section?: { id: string; name: string } | null;
};

export type PaginatedProductsResponse = {
  products: ProductResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ProductStats = {
  total: number;
  active: number;
  unlisted: number;
  disabled: number;
  on_sale: number;
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
  /**
   * Filter by the shop's own grouping. `'none'` means Uncategorised — the
   * products with no section, which are otherwise unreachable from any chip.
   */
  section_id?: string | 'none';
  /** Omit for the `'active'` default; pass `''` explicitly to include every status. */
  status?: ProductStatus | '';
  business_id?: string;
  branch_id?: string;
  sort_by?: ProductSortOrder;
  min_price?: number;
  max_price?: number;
};

export type CategoryFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
  /**
   * Scope to one vertical: returns that vertical's categories PLUS the global
   * (NULL) ones. Omit for every category — the admin view.
   */
  business_type_id?: string | null;
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
