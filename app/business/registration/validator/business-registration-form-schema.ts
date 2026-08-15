import { z } from 'zod';
import { MAX_REGISTRATION_OFFERINGS } from '@/lib/validation/products';

export { MAX_REGISTRATION_OFFERINGS };

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export const businessCategorySchema = z
  .object({
    id: z.guid().optional(),
    type: z.enum(['predefined', 'custom']),
    name: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'custom') {
      if (!val.description || val.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Description is required',
          path: ['description'],
        });
      }
    }
  });

export const step1Schema = z.object({
  business_category: businessCategorySchema,
});

/**
 * The shop's address block, shared by the wizard and the API route so a
 * crafted request can't smuggle a junk address past a client that already
 * checks.
 *
 * - Province/city/barangay come from the ph-locations dataset via selects,
 *   so they only need a presence check (trimmed — a select value never has
 *   padding, but a restored cache or crafted payload might).
 * - Street address: a real address, not a single character. The length cap
 *   keeps a paste-bomb out of the `businesses.location` JSONB and the branch
 *   row that registration mirrors it into.
 * - ZIP: Philippine postal codes are exactly four digits (e.g. Iloilo City
 *   is 5000). Accepting anything else is how 'abc' or '123456' lands in a
 *   verified shop's address.
 * - Latitude/longitude are range-checked and OPTIONAL: the map pin is the
 *   only way they're set, and a shop may legitimately register before
 *   dropping one. `geometry` (the pin proof) is what the map writes.
 */
export const locationSchema = z.object({
  province: z.string().trim().min(1, 'Province is required'),
  city: z.string().trim().min(1, 'City is required'),
  barangay: z.string().trim().min(1, 'Barangay is required'),
  street_address: z
    .string()
    .trim()
    .min(5, 'Enter your full street address')
    .max(255, 'Street address must be 255 characters or less'),
  zip_code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'ZIP code must be exactly 4 digits'),
  latitude: z
    .number({ error: 'Must be a number' })
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  longitude: z
    .number({ error: 'Must be a number' })
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
  geometry: z.string().min(1, 'Set your location coordinates to continue'),
});

export const step2Schema = z.object({
  shop_name: z
    .string()
    .trim()
    .min(1, 'Shop name is required')
    .max(255, 'Shop name must be 255 characters or less'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    // Matches the character counter the Shop Information step shows.
    .max(500, 'Description must be 500 characters or less'),
  location: locationSchema,
});

const fileSchema = z.custom<File>((val) => val instanceof File);
const fileArraySchema = z.custom<File[]>(
  (val) => Array.isArray(val) && val.every((item) => item instanceof File),
);

export const step3Schema = z.object({
  shop_logo: fileSchema
    .refine((file) => file && file.size > 0, 'Logo is required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Image must be 2MB or less')
    .optional(),
  shop_banner: fileSchema
    .refine((file) => file && file.size > 0, 'Banner is required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Image must be 2MB or less')
    .optional(),
  interior_images: fileArraySchema
    .refine((files) => files && files.length >= 4, 'At least 4 images required')
    .refine(
      (files) => files.every((f) => f.size <= MAX_FILE_SIZE),
      'Each image must be 2MB or less',
    )
    .optional(),
});

export const step4Schema = z.object({
  business_license: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be 2MB or less')
    .optional(),
  tax_certificate: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be 2MB or less')
    .optional(),
});

/**
 * The menu step.
 *
 * ONE item is the bar. "Not empty" read literally: a shop that reaches the
 * dashboard with a blank catalogue has a public page showing nothing, which
 * is the state this whole step exists to prevent. Asking for three would
 * triple the phone typing at the point where abandonment is highest, and
 * would make a shop with two real offerings unable to finish registering —
 * items two onward are the dashboard's job, where the setup checklist and the
 * follow-up email already push.
 *
 * No image field: each would be a separate ≤2 MB upload and its own IndexedDB
 * cache entry, and the image is already optional on the dashboard form.
 */
export const registrationOfferingSchema = z
  .object({
    /**
     * Client-side identity, stripped before the API call.
     *
     * The photo for this row is cached in IndexedDB under a key derived from
     * this id. Keying on the ARRAY INDEX instead would re-map every time an
     * item is removed — deleting item 1 would silently move item 2's photo
     * onto item 1 — so the key has to be stable for the life of the row.
     */
    uid: z.string().min(1),
    name: z.string().trim().min(1, 'Name is required').max(255),
    /**
     * Null is only legal for a quote-based offering — the same rule the DB
     * CHECK enforces (`price_type = 'on_request' OR price IS NOT NULL`), so a
     * form that satisfies this cannot produce a row the database rejects.
     */
    price: z
      .number({ error: 'Price must be a number' })
      .min(0, 'Price cannot be negative')
      .nullable(),
    // Plain boolean, deliberately NOT `.default(false)`: a default splits
    // zod's input and output types, so `BusinessProps` (the OUTPUT) would say
    // `boolean` while the resolver's input said `boolean | undefined`, and
    // `useForm<BusinessProps>` refuses the mismatch. Nothing is lost — every
    // item is built by the step, which always sets this.
    on_request: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (!val.on_request && (val.price === null || Number.isNaN(val.price))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a price, or mark it as priced on request',
        path: ['price'],
      });
    }
  });

export const stepOfferingsSchema = z.object({
  offerings: z
    .array(registrationOfferingSchema)
    .min(1, 'Add at least one item so your shop page is not empty')
    .max(
      MAX_REGISTRATION_OFFERINGS,
      `You can add up to ${MAX_REGISTRATION_OFFERINGS} here — the rest go in your dashboard`,
    ),
});

/**
 * The optional first deal.
 *
 * OPTIONAL, unlike the menu step, and the ordering is the reason: a shop with
 * no menu has nothing to discount. Deals are item 5 on the setup checklist to
 * the menu's 4, and making both mandatory would double the abandonment cost of
 * a step nobody has asked for yet.
 *
 * `null` means skipped. An absent object is a deliberate choice, not a
 * half-filled form, so nothing is written and Submit is unaffected.
 */
export const MAX_DEAL_DURATION_DAYS = 365;

/**
 * The discount arms the launch-deal step can produce. Mirrors the stored
 * `DiscountValue` union (lib/types/coupon.ts) but as flat form fields:
 * `discount_value` for percentage/fixed, `bogo_buy`/`bogo_get` for bogo,
 * nothing for free. The wizard's request builder converts this flat shape to
 * the union, the same way the Phase 1 coupon dialog does.
 */
export const registrationDealDiscountTypeSchema = z.enum([
  'percentage',
  'fixed_amount',
  'free',
  'bogo',
]);

export const registrationDealSchema = z
  .object({
    /**
     * Client-side identity for the deal's photo cache key. There is only ever
     * one deal, but keying it the same way as the offerings means one cache
     * module, one restore path and one cleanup rule rather than a special
     * case that drifts.
     */
    uid: z.string().min(1),
    code: z
      .string()
      .trim()
      .min(1, 'Enter a code customers will type or show')
      .max(50),
    description: z.string().trim().max(500).optional(),
    discount_type: registrationDealDiscountTypeSchema,
    /** Null for free/bogo — those arms carry no numeric value. */
    discount_value: z
      .number({ error: 'Enter how much off' })
      .positive('Discount must be more than zero')
      .nullable(),
    /** Present only for bogo: how many the customer buys. */
    bogo_buy: z.number().int().min(1).optional(),
    /** Present only for bogo: how many identical items are free. */
    bogo_get: z.number().int().min(1).optional(),
    // No `.default()` here, for the same reason `on_request` has none: a
    // default splits zod's input and output types, and `useForm<BusinessProps>`
    // refuses the mismatch. The step always sets it.
    duration_days: z.number().int().positive().max(MAX_DEAL_DURATION_DAYS),
    /**
     * 🔴 Defaults to FALSE — the deal is created as a draft.
     *
     * A published coupon inside its date window enters `mobile_deals`, which
     * is the app's Deals front page, and is immediately REDEEMABLE: a real
     * `user_redemptions` row, a real 6-character cashier code, and a real
     * notification to the owner, for a discount a first-time owner may have
     * ticked past without reading. Publishing has to be something they choose,
     * not something the form assumes.
     */
    publish: z.boolean(),
  })
  .superRefine((val, ctx) => {
    // Percentage/fixed need a value; free/bogo must NOT carry one.
    if (
      (val.discount_type === 'percentage' ||
        val.discount_type === 'fixed_amount') &&
      val.discount_value == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter how much off',
        path: ['discount_value'],
      });
    }
    // A percentage over 100 is a coupon that pays the customer to shop.
    if (val.discount_type === 'percentage' && val.discount_value! > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A percentage discount cannot be more than 100%',
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
  });

export const stepDealSchema = z.object({
  deal: registrationDealSchema.nullable(),
});

export const step5Schema = z.object({
  accepted_terms: z
    .boolean()
    .refine(
      (val) => val === true,
      'You must accept the Terms and Conditions and Privacy Policy to register',
    ),
});

export const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(stepOfferingsSchema)
  .merge(stepDealSchema)
  .merge(step5Schema);

export type BusinessProps = z.infer<typeof fullSchema>;
