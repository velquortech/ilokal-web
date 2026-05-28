/**
 * Branch Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Branch Schemas =====

export const branchStatusSchema = z.enum([
  'pending_review',
  'active',
  'rejected',
]);

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(50).optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .optional()
    .or(z.literal('')),
  description: z.string().max(1000).optional(),
  status: branchStatusSchema.optional(),
  business_permit_url: z.string().url().optional(),
  other_document_url: z.string().url().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  gallery_images: z.array(z.string().url()).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const branchFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_km: z.number().min(0.1).max(50000).optional(),
  sort_by: z
    .enum(['name_asc', 'name_desc', 'newest', 'oldest'])
    .default('name_asc'),
});
