import { z } from 'zod';

export const createReviewSchema = z.object({
  user_id: z.string().uuid(),
  business_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const reviewQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(20),
});

export type ReviewQueryParams = z.infer<typeof reviewQuerySchema>;
