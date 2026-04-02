import { z } from 'zod';

const baseRatingSchema = z.object({
  product_id: z.string().uuid('Must be a valid UUID').optional(),
  business_id: z.string().uuid('Must be a valid UUID').optional(),
  rating: z
    .number('Rating must be a number')
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  review_text: z
    .string('Review text must be a string')
    .max(1000, 'Review text is too long')
    .optional(),
});

export const createRatingSchema = baseRatingSchema.refine(
  (data) => data.product_id || data.business_id,
  {
    message: 'Either product_id or business_id must be provided',
  },
);

export type CreateRatingRequest = z.infer<typeof createRatingSchema>;

export const updateRatingSchema = baseRatingSchema.partial();
export type UpdateRatingRequest = z.infer<typeof updateRatingSchema>;
