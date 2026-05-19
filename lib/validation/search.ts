/**
 * Search validation schemas using Zod
 */

import { z } from 'zod';

// Search type validation
export const searchTypeSchema = z.enum(['business', 'product', 'deal', 'all']);

// Sort by validation
export const sortBySchema = z.enum([
  'relevance',
  'newest',
  'popular',
  'rating',
  'distance',
]);

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

// Search filters validation
export const searchFiltersSchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  min_rating: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe('Minimum rating (0-5)'),
  max_rating: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .describe('Maximum rating (0-5)'),
  min_price: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum price in cents'),
  max_price: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Maximum price in cents'),
  verified_only: z
    .boolean()
    .optional()
    .describe('Filter verified businesses only'),
  is_featured: z.boolean().optional().describe('Filter featured deals only'),
  location: z.string().optional().describe('Location/area filter'),
  distance_km: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe('Distance radius in km'),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

export type PaginationParams = z.infer<typeof paginationSchema>;

// Global search schema
export const globalSearchSchema = z.object({
  query: z.string().min(1).max(100).trim().describe('Search query string'),
  type: searchTypeSchema
    .default('all')
    .describe('Search type: all, business, product, deal'),
  filters: searchFiltersSchema.optional().describe('Search filters'),
  sort_by: sortBySchema.default('relevance').describe('Sort results by'),
  pagination: paginationSchema
    .default({ page: 1, per_page: 20 })
    .describe('Pagination parameters'),
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;

// Business search schema
export const businessSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .describe('Business name/description search'),
  filters: searchFiltersSchema.optional(),
  sort_by: sortBySchema.default('relevance'),
  pagination: paginationSchema.default({ page: 1, per_page: 20 }),
});

export type BusinessSearchInput = z.infer<typeof businessSearchSchema>;

// Product search schema
export const productSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .describe('Product name/description search'),
  filters: searchFiltersSchema.optional(),
  sort_by: sortBySchema.default('relevance'),
  pagination: paginationSchema.default({ page: 1, per_page: 20 }),
});

export type ProductSearchInput = z.infer<typeof productSearchSchema>;

// Deal search schema
export const dealSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .describe('Deal title/description search'),
  filters: searchFiltersSchema.optional(),
  sort_by: sortBySchema.default('relevance'),
  pagination: paginationSchema.default({ page: 1, per_page: 20 }),
});

export type DealSearchInput = z.infer<typeof dealSearchSchema>;

// Advanced filter schema
export const advancedFilterSchema = z.object({
  category: z.string().optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_rating: z.number().min(0).max(5).optional(),
  min_price: z.number().int().min(0).optional(),
  max_price: z.number().int().min(0).optional(),
  verified_only: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  location: z.string().optional(),
});

export type AdvancedFilterInput = z.infer<typeof advancedFilterSchema>;

// Trending query schema
export const trendingQuerySchema = z.object({
  period: z
    .enum(['today', 'week', 'month'])
    .default('week')
    .describe('Trending period'),
  type: z
    .enum(['business', 'product', 'all'])
    .default('all')
    .describe('Trending type'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Number of results'),
});

export type TrendingQueryInput = z.infer<typeof trendingQuerySchema>;
