import { z } from 'zod';

// POST /api/protected/mobile/plans — create a new plan.
export const createPlanSchema = z.object({
  title: z.string().min(1).max(200),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

// A single stop entry within a PUT request.
const stopInputSchema = z.object({
  business_id: z.guid(),
  stop_time: z.string().nullable(),
});

// PUT /api/protected/mobile/plans/:planId — replace title, date, and stops.
export const updatePlanSchema = z.object({
  title: z.string().min(1).max(200),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  stops: z.array(stopInputSchema),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
