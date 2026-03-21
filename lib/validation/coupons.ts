/**
 * Coupon & Featured Deal Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Discount Schema =====

export const discountTypeSchema = z.enum(['percentage', 'fixed_amount']);

export const discountValueSchema = z.object({
  type: discountTypeSchema,
  value: z.number().min(0),
});

// ===== Coupon Schemas =====

export const usageScopeSchema = z.enum([
  'any',
  'specific_categories',
  'specific_products',
]);

export const createCouponSchema = z
  .object({
    code: z.string().min(1).max(50).toUpperCase(),
    description: z.string().optional(),
    discount: discountValueSchema,
    usage_scope: usageScopeSchema,
    scope_values: z.array(z.string().uuid()).optional(),
    start_date: z.string().datetime(),
    expiry_date: z.string().datetime(),
    max_redemptions_global: z.number().min(1).optional(),
    max_redemptions_per_user: z.number().min(1).optional(),
  })
  .refine(
    (data) =>
      // expiry_date must be after start_date
      new Date(data.expiry_date) > new Date(data.start_date),
    'Expiry date must be after start date',
  );

export const updateCouponSchema = z
  .object({
    code: z.string().min(1).max(50).toUpperCase().optional(),
    description: z.string().optional(),
    discount: discountValueSchema.optional(),
    usage_scope: usageScopeSchema.optional(),
    scope_values: z.array(z.string().uuid()).optional(),
    start_date: z.string().datetime().optional(),
    expiry_date: z.string().datetime().optional(),
    max_redemptions_global: z.number().min(1).optional(),
    max_redemptions_per_user: z.number().min(1).optional(),
  })
  .refine((data) => {
    // If both start_date and expiry_date provided, validate order
    if (data.start_date && data.expiry_date) {
      return new Date(data.expiry_date) > new Date(data.start_date);
    }
    return true;
  }, 'Expiry date must be after start date');

export const couponFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'expired', 'all']).default('active'),
  sort_by: z
    .enum(['newest', 'oldest', 'expiry_asc', 'expiry_desc'])
    .default('newest'),
});

// ===== Featured Deal Schemas =====

export const durationSchema = z.enum(['daily', 'weekly', 'monthly']);

export const placementSchema = z.enum([
  'category_page',
  'homepage_banner',
  'search_featured',
]);

export const createFeaturedDealSchema = z
  .object({
    coupon_id: z.string().uuid('Invalid coupon ID'),
    duration: durationSchema,
    placement: placementSchema,
    start_date: z.string().datetime(),
    end_date: z.string().datetime().optional(),
    price_cents: z.number().min(0),
  })
  .refine((data) => {
    // If end_date provided, it must be after start_date
    if (data.end_date) {
      return new Date(data.end_date) > new Date(data.start_date);
    }
    return true;
  }, 'End date must be after start date');

export const updateFeaturedDealSchema = z
  .object({
    coupon_id: z.string().uuid('Invalid coupon ID').optional(),
    duration: durationSchema.optional(),
    placement: placementSchema.optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    price_cents: z.number().min(0).optional(),
  })
  .refine((data) => {
    // If both start_date and end_date provided, validate order
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) > new Date(data.start_date);
    }
    return true;
  }, 'End date must be after start date');

export const featuredDealFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  placement: placementSchema.optional(),
  sort_by: z
    .enum(['newest', 'oldest', 'expiry_asc', 'expiry_desc'])
    .default('newest'),
});
