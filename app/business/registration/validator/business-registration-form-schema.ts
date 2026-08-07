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

export const step2Schema = z.object({
  shop_name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  location: z.object({
    province: z.string().min(1),
    city: z.string().min(1),
    barangay: z.string().min(1),
    street_address: z.string().min(1),
    zip_code: z.string().min(1),
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
  }),
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

export const registrationDealSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Enter a code customers will type or show')
      .max(50),
    description: z.string().trim().max(500).optional(),
    discount_type: z.enum(['percentage', 'fixed_amount']),
    discount_value: z
      .number({ error: 'Enter how much off' })
      .positive('Discount must be more than zero'),
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
    // A percentage over 100 is a coupon that pays the customer to shop.
    if (val.discount_type === 'percentage' && val.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A percentage discount cannot be more than 100%',
        path: ['discount_value'],
      });
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
