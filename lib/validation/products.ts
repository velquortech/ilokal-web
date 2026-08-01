/**
 * Product & Category Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Product Schemas =====

export const productStatusSchema = z.enum(['active', 'unlisted', 'disabled']);

export const priceTypeSchema = z.enum([
  'fixed',
  'from',
  'per_hour',
  'per_day',
  'per_person',
  'per_event',
  'on_request',
]);

export const offeringKindSchema = z.enum(['product', 'service']);

export const bookingModeSchema = z.enum([
  'none',
  'inquiry',
  'request',
  'timeslot',
  'date_range',
]);

export const serviceLocationSchema = z.enum([
  'at_business',
  'at_customer',
  'both',
]);

/**
 * Mirrors the DB CHECKs in `20260727000003` so a bad payload fails with a
 * readable message instead of a raw 23514 from PostgREST.
 */
const offeringAttributeShape = {
  kind: offeringKindSchema.optional(),
  booking_mode: bookingModeSchema.optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  lead_time_minutes: z.number().int().min(0).nullable().optional(),
  inventory_count: z.number().int().min(0).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  deposit_amount: z.number().min(0).nullable().optional(),
  min_duration_units: z.number().int().positive().nullable().optional(),
  max_duration_units: z.number().int().positive().nullable().optional(),
  service_location: serviceLocationSchema.optional(),
};

/**
 * Cross-field rules shared by create and update.
 *
 * `price` is optional at the field level because a quote-based offering has
 * none — the DB CHECK `price_type = 'on_request' OR price IS NOT NULL` is the
 * real gate, and this reproduces it with a message a user can act on.
 */
function refineOfferingPricing(
  input: {
    price?: number | null;
    price_type?: string;
    sale_price?: number | null;
    min_duration_units?: number | null;
    max_duration_units?: number | null;
  },
  ctx: z.RefinementCtx,
  { requirePrice }: { requirePrice: boolean },
) {
  const isQuote = input.price_type === 'on_request';

  if (isQuote) {
    if (input.price != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Quote-based offerings cannot carry a price',
      });
    }
    if (input.sale_price != null) {
      // A percentage off an unknown number is meaningless.
      ctx.addIssue({
        code: 'custom',
        path: ['sale_price'],
        message: 'Quote-based offerings cannot go on sale',
      });
    }
  } else if (
    requirePrice ? input.price == null : 'price' in input && input.price == null
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['price'],
      message: 'Price is required unless the price type is "on request"',
    });
  }

  if (
    input.min_duration_units != null &&
    input.max_duration_units != null &&
    input.min_duration_units > input.max_duration_units
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['max_duration_units'],
      message: 'Maximum duration must be at least the minimum',
    });
  }
}

const createProductShape = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').nullable().optional(),
  sale_price: z.number().min(0).nullable().optional(),
  price_type: priceTypeSchema.optional(),
  price_unit: z.string().nullable().optional(),
  category_id: z.guid('Invalid category ID').nullable().optional(),
  // The shop's own grouping — independent of category_id, which is the
  // platform taxonomy. Ownership of the section is checked in the service.
  section_id: z.guid('Invalid section ID').nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  branch_id: z.guid().nullable().optional(),
  ...offeringAttributeShape,
});

export const createProductSchema = createProductShape.superRefine(
  (input, ctx) => refineOfferingPricing(input, ctx, { requirePrice: true }),
);

export const updateProductSchema = createProductShape
  .partial()
  .extend({ status: productStatusSchema.optional() })
  .superRefine((input, ctx) =>
    refineOfferingPricing(input, ctx, { requirePrice: false }),
  );

export const productFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  category_id: z.guid().optional(),
  // 'none' is the Uncategorised filter (section_id IS NULL); anything else
  // must be a real id.
  section_id: z.union([z.guid(), z.literal('none')]).optional(),
  status: productStatusSchema.optional(),
  business_id: z.guid().optional(),
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

export const applySaleSchema = z
  .object({
    sale_price: z.number().positive('Sale price must be positive'),
    sale_starts_at: z.string().datetime({ offset: true }).nullable().optional(),
    sale_ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.sale_starts_at || !data.sale_ends_at) return true;
      return data.sale_ends_at > data.sale_starts_at;
    },
    { message: 'End date must be after start date', path: ['sale_ends_at'] },
  );

// ===== Category Schemas =====

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  slug: z.string().min(1, 'Category slug is required').max(255),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(500).default(10),
  search: z.string().optional(),
  sort_by: z
    .enum(['name_asc', 'name_desc', 'newest', 'oldest'])
    .default('name_asc'),
});

// ===== Type Exports =====

export type ApplySaleInput = z.infer<typeof applySaleSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryFiltersInput = z.infer<typeof categoryFiltersSchema>;
