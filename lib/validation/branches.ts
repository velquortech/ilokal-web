/**
 * Branch Validation Schemas
 * Using Zod for runtime type safety and validation
 */

import { z } from 'zod';

// ===== Branch Schemas =====

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  address: z.string().min(1, 'Address is required').max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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
