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
  interior_images: z
    .array(z.string().url('Each gallery image must be a valid URL'))
    .max(10, 'Maximum 10 gallery images allowed')
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
