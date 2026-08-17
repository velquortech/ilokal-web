/**
 * Coupon & Featured Deal Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Discount Schema =====
// The stored shape on `coupons.discount` (JSONB). Discriminated on `type` so a
// percentage cannot slip in without a 0..100 value and a BOGO cannot ship
// without buy/get quantities. Kept in sync with `DiscountValue` in
// lib/types/coupon.ts and the `coupons_discount_shape_check` constraint
// (20260817000000) — widen all three together.

export const discountTypeSchema = z.enum([
  'percentage',
  'fixed_amount',
  'free',
  'bogo',
]);

const percentageDiscountSchema = z.object({
  type: z.literal('percentage'),
  value: z
    .number()
    .positive('Discount must be more than zero')
    .max(100, 'A percentage discount cannot be more than 100%'),
});

const fixedAmountDiscountSchema = z.object({
  type: z.literal('fixed_amount'),
  value: z.number().positive('Discount must be more than zero'),
});

const freeDiscountSchema = z.object({
  type: z.literal('free'),
  value: z.null(),
});

const bogoDiscountSchema = z.object({
  type: z.literal('bogo'),
  buy: z.number().int().min(1, 'Buy quantity must be at least 1'),
  get: z.number().int().min(1, 'Get quantity must be at least 1'),
  max_free: z.number().int().min(1).optional(),
  value: z.null(),
});

export const discountValueSchema = z.discriminatedUnion('type', [
  percentageDiscountSchema,
  fixedAmountDiscountSchema,
  freeDiscountSchema,
  bogoDiscountSchema,
]);

// ===== Coupon Schemas =====

export const promotionTypeSchema = z.enum(['coupon', 'deal']);

export const couponStatusSchema = z.enum(['published', 'draft']);

export const usageScopeSchema = z.enum([
  'any',
  'specific_categories',
  'specific_products',
]);

export const createCouponSchema = z
  .object({
    promotion_type: promotionTypeSchema.default('coupon'),
    status: couponStatusSchema.default('draft'),
    code: z.string().trim().min(1).max(50).toUpperCase(),
    description: z.string().optional(),
    discount: discountValueSchema,
    usage_scope: usageScopeSchema,
    scope_values: z.array(z.guid()).optional(),
    start_date: z.string().datetime(),
    expiry_date: z.string().datetime(),
    max_redemptions_global: z.number().min(1).optional(),
    max_redemptions_per_user: z.number().min(1).optional(),
    requires_follow: z.boolean().optional(),
    image_url: z.string().max(512).nullable().optional(),
    branch_id: z.guid().nullable().optional(), // null = all branches
  })
  .refine(
    (data) =>
      // expiry_date must be after start_date
      new Date(data.expiry_date) > new Date(data.start_date),
    'Expiry date must be after start date',
  );

export const updateCouponSchema = z
  .object({
    promotion_type: promotionTypeSchema.optional(),
    status: couponStatusSchema.optional(),
    code: z.string().trim().min(1).max(50).toUpperCase().optional(),
    description: z.string().optional(),
    discount: discountValueSchema.optional(),
    usage_scope: usageScopeSchema.optional(),
    scope_values: z.array(z.guid()).optional(),
    start_date: z.string().datetime().optional(),
    expiry_date: z.string().datetime().optional(),
    max_redemptions_global: z.number().min(1).optional(),
    max_redemptions_per_user: z.number().min(1).optional(),
    requires_follow: z.boolean().optional(),
    image_url: z.string().max(512).nullable().optional(),
    branch_id: z.guid().nullable().optional(), // null = all branches
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
  status: couponStatusSchema.optional(),
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
    coupon_id: z.guid('Invalid coupon ID'),
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
    coupon_id: z.guid('Invalid coupon ID').optional(),
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
