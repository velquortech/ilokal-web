/**
 * Business Validation Schemas
 *
 * Zod schemas for validating business-related inputs and filters.
 * Used in both server actions and API routes.
 */

import { z } from 'zod';

// ============================================================================
// BUSINESS PROFILE UPDATE SCHEMA (business owner — profile page)
// ============================================================================

/**
 * The gallery rules live in `config/gallery.ts` — a dependency-free module, so
 * the three client components that need them do not pull Zod into their bundle
 * for two integers. Re-exported here so call sites have one import to reach for.
 */
export {
  MAX_GALLERY_IMAGES,
  MASONRY_MIN_IMAGES,
  GALLERY_BUCKET,
  isOwnGalleryPath,
  foreignGalleryPaths,
} from '@/config/gallery';

/**
 * Tab, CR, LF and other control characters — the smuggling vector. Same set
 * as `lib/utils/safeExternalUrl.ts`.
 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f]/;

/**
 * 🔴 NOT `z.string().url()`. Zod's `url()` is backed by `new URL()`, which
 * **accepts `javascript:alert(1)`** — the exact trap `urlOrEmpty` had to be
 * fixed for before these columns were rendered. `interior_images` is returned
 * by `/api/mobile/businesses/[businessId]` and rendered on public surfaces, so
 * an http(s) allowlist is the floor, not a nicety.
 *
 * A bucket-relative path is also accepted, because that is what registration
 * writes and what this column now stores.
 *
 * Control characters are rejected outright rather than trimmed away, for the
 * reason `safeExternalUrl` rejects them: `"\tjavascript:…"` does not START with
 * a scheme, so a naive test reads it as a relative path and lets it through,
 * while a browser strips the tab and honours the scheme.
 */
const galleryImageSchema = z
  .string()
  .min(1, 'Each gallery image must be a URL or a storage path')
  .refine((value) => !FORBIDDEN_CHARS.test(value), 'Invalid gallery image')
  .refine(
    (value) =>
      /^https?:\/\//.test(value) ||
      // Protocol-relative inherits the page's scheme, so it resolves off-site.
      (!value.startsWith('//') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)),
    'Gallery images must be http(s) URLs',
  );

const galleryImagesSchema = z.array(galleryImageSchema);

/**
 * The gallery, and NOTHING else.
 *
 * 🔴 Deliberately not `updateBusinessProfileSchema.pick(...)`: that action
 * writes `description`, `logo_url`, `banner_url` and `category_id` as
 * `?? null` unconditionally, so a caller sending only the gallery erases four
 * columns. The narrow schema exists so the narrow action cannot grow the wide
 * one's payload by accident.
 *
 * 🔴 No `.max()` here, and that is deliberate. Nothing caps the gallery at
 * upload time — `step3Schema` requires **at least** four interior photos and
 * `/api/web/upload/business-interior` appends without a ceiling — so a shop
 * that registered with eleven photos would have every write rejected by a flat
 * cap, **including the removals that would bring it back under**. The action
 * enforces the cap on GROWTH instead, against the row it just read.
 */
export const businessGallerySchema = z.object({
  interior_images: galleryImagesSchema,
});

export type BusinessGalleryInput = z.infer<typeof businessGallerySchema>;

export const updateBusinessProfileSchema = z.object({
  shop_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(255, 'Business name must not exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .nullable(),
  logo_url: z
    .string()
    .url('Logo URL must be a valid URL')
    .optional()
    .nullable(),
  banner_url: z
    .string()
    .url('Banner URL must be a valid URL')
    .optional()
    .nullable(),
  category_id: z.guid('Invalid category ID').optional().nullable(),
  // 🔴 No flat cap here either. This form resubmits the WHOLE array on every
  // save, so a shop that registered with eleven photos could not change its
  // name, description or category — the same dead end the gallery action's
  // growth rule exists to avoid, on a form that has nothing to do with photos.
  // `updateBusinessProfileAction` applies the growth rule instead; it already
  // reads the current row.
  interior_images: galleryImagesSchema.optional().nullable(),
});

export type UpdateBusinessProfileInput = z.infer<
  typeof updateBusinessProfileSchema
>;

// ============================================================================
// BUSINESS CREATION & UPDATE SCHEMAS
// ============================================================================

/**
 * Schema for creating a business
 */
export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(255, 'Business name must not exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  logo_url: z.string().url('Logo URL must be a valid URL').optional(),
  interior_images: z
    .string()
    .url('Each image URL must be valid')
    .array()
    .max(10, 'Maximum 10 interior images allowed')
    .optional(),
  verification_docs_url: z
    .string()
    .url('Each document URL must be valid')
    .array()
    .max(5, 'Maximum 5 verification documents allowed')
    .optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

/**
 * Schema for updating a business
 */
export const updateBusinessSchema = createBusinessSchema.partial();

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

/**
 * Schema for admin updating a business (includes status)
 */
export const adminUpdateBusinessSchema = updateBusinessSchema.extend({
  status: z.enum(['pending', 'verified', 'suspended', 'rejected']).optional(),
});

export type AdminUpdateBusinessInput = z.infer<
  typeof adminUpdateBusinessSchema
>;

/**
 * Schema for verifying/rejecting a business
 */
export const verifyBusinessSchema = z.object({
  verified: z.boolean(),
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional(),
});

export type VerifyBusinessInput = z.infer<typeof verifyBusinessSchema>;

/**
 * Schema for suspending a business
 */
export const suspendBusinessSchema = z.object({
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason must not exceed 500 characters'),
});

export type SuspendBusinessInput = z.infer<typeof suspendBusinessSchema>;

// ============================================================================
// FILTER & PAGINATION SCHEMAS
// ============================================================================

/**
 * Schema for filtering/searching businesses
 */
export const businessFiltersSchema = z.object({
  status: z
    .enum(['pending', 'verified', 'suspended', 'rejected', 'all'])
    .optional()
    .default('all'),
  search: z.string().trim().optional(),
  sortBy: z.enum(['created', 'updated', 'name']).optional().default('created'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  pageSize: z
    .number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size must not exceed 100')
    .optional()
    .default(10),
});

export type BusinessFilters = z.infer<typeof businessFiltersSchema>;

// ============================================================================
// ID VALIDATION
// ============================================================================

/**
 * Schema for validating UUID
 */
export const uuidSchema = z.object({
  id: z.guid('Invalid business ID format'),
});

/**
 * A bare business id, for callers that hold the value rather than an object.
 *
 * Worth its own export because `verifyBusinessOwner(businessId?)` treats a
 * FALSY id as "no argument" and falls back to whichever shop `.limit(1)`
 * returns — so an unvalidated `''` reaching it authorizes against the wrong
 * shop for an owner who holds two. Validate before the call, not after.
 */
export const businessIdSchema = z.guid('Invalid business ID format');

// ============================================================================
// UPLOAD VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating business logo upload request
 */
export const businessLogoUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      'File size must be less than 2MB',
    ),
  businessId: z.guid('Invalid business ID format'),
});

export type BusinessLogoUploadInput = z.infer<typeof businessLogoUploadSchema>;

/**
 * Schema for validating interior photos upload request
 */
export const interiorPhotosUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      'File size must be less than 2MB',
    ),
  businessId: z.guid('Invalid business ID format'),
});

export type InteriorPhotosUploadInput = z.infer<
  typeof interiorPhotosUploadSchema
>;

/**
 * Schema for validating verification documents upload request
 */
export const verificationDocsUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      'File size must be less than 2MB',
    ),
  businessId: z.guid('Invalid business ID format'),
});

export type VerificationDocsUploadInput = z.infer<
  typeof verificationDocsUploadSchema
>;

/**
 * Schema for validating file deletion request
 */
export const fileDeleteSchema = z.object({
  bucket: z.enum([
    'avatars',
    'business-logos',
    'business-interior',
    'verification-docs',
  ]),
  filePath: z.string().min(1, 'File path is required'),
});

export type FileDeleteInput = z.infer<typeof fileDeleteSchema>;
