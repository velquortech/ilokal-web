/**
 * The template-first coupon/deal dialog's flat form schema.
 *
 * The dialog edits a FLAT shape (discount_type + discount_value + bogo
 * quantities) and builds the stored `DiscountValue` union at submit — the
 * wizard's Launch Deal step does the same, and a flat form is what
 * react-hook-form handles best. The server-side contract stays
 * `createCouponSchema` / `updateCouponSchema` (lib/validation/coupons.ts),
 * which validate the built union; this schema only gates what the dialog can
 * submit.
 */

import { z } from 'zod';

/** The preset chips at the top of the dialog. `custom` = build from scratch. */
export const PROMO_TEMPLATE_IDS = [
  'pct5',
  'pct10',
  'pct15',
  'fixed',
  'free',
  'bogo',
  'custom',
] as const;

export type PromoTemplateId = (typeof PROMO_TEMPLATE_IDS)[number];

export const promoFormSchema = z
  .object({
    promotion_type: z.enum(['coupon', 'deal']),
    status: z.enum(['draft', 'published']),
    template: z.enum(PROMO_TEMPLATE_IDS),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(50, 'Code must be at most 50 characters'),
    description: z.string().trim().max(500).optional(),
    // The flat discount fields. `discount_value` only exists for percentage /
    // fixed_amount; `bogo_buy`/`bogo_get` only for bogo. The superRefine below
    // enforces each type's requirements.
    discount_type: z.enum(['percentage', 'fixed_amount', 'free', 'bogo']),
    discount_value: z.number().optional(),
    bogo_buy: z.number().int().min(1).optional(),
    bogo_get: z.number().int().min(1).optional(),
    usage_scope: z.enum(['any', 'specific_products']),
    scope_values: z.array(z.string()).default([]),
    start_date: z.string().min(1, 'Start date is required'),
    expiry_date: z.string().min(1, 'Expiry date is required'),
    max_redemptions_global: z.string().optional(),
    max_redemptions_per_user: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // A percentage over 100 pays the customer to shop.
    if (
      val.discount_type === 'percentage' &&
      val.discount_value != null &&
      val.discount_value > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A percentage discount cannot be more than 100%',
        path: ['discount_value'],
      });
    }

    // Percentage / fixed amount need a value; the other two types must NOT
    // carry one (their value is always null in the stored union).
    if (
      (val.discount_type === 'percentage' ||
        val.discount_type === 'fixed_amount') &&
      val.discount_value == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount value is required',
        path: ['discount_value'],
      });
    }

    // BOGO needs both quantities.
    if (val.discount_type === 'bogo') {
      if (val.bogo_buy == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter how many the customer buys',
          path: ['bogo_buy'],
        });
      }
      if (val.bogo_get == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter how many are free',
          path: ['bogo_get'],
        });
      }
    }

    // Expiry after start, when both are present.
    if (val.start_date && val.expiry_date) {
      if (new Date(val.expiry_date) <= new Date(val.start_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry date must be after the start date',
          path: ['expiry_date'],
        });
      }
    }
  });

export type PromoFormValues = z.input<typeof promoFormSchema>;
