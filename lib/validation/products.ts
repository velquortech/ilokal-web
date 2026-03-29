/**
 * Product & Category Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Product Schemas =====

export const productStatusSchema = z.enum(['active', 'inactive', 'archived']);

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  category_id: z.string().uuid('Invalid category ID'),
  image_url: z.string().url().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: productStatusSchema.optional(),
});

export const productFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  status: productStatusSchema.optional(),
  business_id: z.string().uuid().optional(),
  sort_by: z
    .enum([
      'newest',
      'oldest',
      'name_asc',
      'name_desc',
      'price_low',
      'price_high',
    ])
    .default('newest'),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
});

// ===== Category Schemas =====

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  slug: z.string().min(1, 'Category slug is required').max(255),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sort_by: z
    .enum(['name_asc', 'name_desc', 'newest', 'oldest'])
    .default('name_asc'),
});

// ===== Type Exports =====

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryFiltersInput = z.infer<typeof categoryFiltersSchema>;
