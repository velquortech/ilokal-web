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
 * Gallery ceiling — the ONE place this number lives.
 *
 * Read by the Zod schemas below, by `GalleryUploader`'s add tile, and by the
 * copy on the gallery page. A second literal is how the form starts refusing an
 * eleventh photo the server would have accepted, or the reverse.
 */
export const MAX_GALLERY_IMAGES = 10;

/**
 * How many photos the shop page needs before it renders the full masonry
 * layout — `Masonry` hard-returns below this and `ShopGallery` falls back to a
 * plain 3-up grid. Stated on the gallery page because an owner with three
 * photos otherwise cannot tell why their shop page looks different.
 */
export const MASONRY_MIN_IMAGES = 4;

/**
 * 🔴 NOT `z.string().url()`. Zod's `url()` is backed by `new URL()`, which
 * **accepts `javascript:alert(1)`** — the exact trap `urlOrEmpty` had to be
 * fixed for before these columns were rendered. `interior_images` is returned
 * by `/api/mobile/businesses/[businessId]` and rendered on public surfaces, so
 * an http(s) allowlist is the floor, not a nicety.
 *
 * A bucket-relative path is also accepted, because that is what registration
 * writes and what these columns now store.
 */
const galleryImageSchema = z
  .string()
  .min(1, 'Each gallery image must be a URL or a storage path')
  .refine(
    (value) =>
      /^https?:\/\//.test(value) || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value),
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

/**
 * Is this gallery entry a file inside THIS shop's own folder?
 *
 * 🔴 The FK-shaped assumption that a client-supplied storage key is safe is
 * what this closes. `extractStoragePath` returns any non-`http` string verbatim
 * and blindly slices whatever follows the bucket marker, so
 * `…/interior-images/<otherShopId>/x.webp` or `…/interior-images/../shop-logos/x.webp`
 * would be stored as sent and then handed to `storage.remove()`. The bucket's
 * DELETE policy is the only other backstop and it does **not** stop an owner who
 * holds two shops from deleting shop B's file through shop A's gallery.
 *
 * Every upload path writes `<businessId>/<filename>` — registration
 * (`business.ts`), the upload route, and nothing else — so exactly one segment
 * of prefix and one of filename is the whole legitimate shape. A foreign host
 * fails this too: it normalises to itself verbatim and does not start with the
 * id.
 */
export function isOwnGalleryPath(path: string, businessId: string): boolean {
  const segments = path.split('/');
  if (segments.length !== 2) return false;
  const [prefix, filename] = segments;
  return (
    prefix === businessId && !!filename && filename !== '.' && filename !== '..'
  );
}

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
  // Keeps its flat cap: this form has always had one, and the growth rule that
  // replaces it in the gallery action needs the current row to compare against,
  // which this action reads for a different reason.
  interior_images: galleryImagesSchema
    .max(MAX_GALLERY_IMAGES, `Maximum ${MAX_GALLERY_IMAGES} gallery images`)
    .optional()
    .nullable(),
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
