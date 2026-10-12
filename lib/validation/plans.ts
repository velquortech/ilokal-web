import { z } from 'zod';

/**
 * Body for POST /api/protected/mobile/plans — create an empty plan.
 * `target_date` is the plan's single date, sent as a Postgres `date` string
 * (`YYYY-MM-DD`). Validate shape at the boundary so type-confused input becomes
 * a clean 400, not a downstream 500.
 */
export const createPlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the plan a title')
    .max(120, 'Keep the title under 120 characters'),
  target_date: z.iso.date('target_date must be a YYYY-MM-DD date'),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

/** A single stop's data in the PUT replace-all model. */
const planStopInputSchema = z.object({
  business_id: z.guid(),
  // "HH:mm" or null for a day-only check. Mirrors the `time` column; sending
  // null means only the weekday (closed or not) is evaluated, not the hour.
  stop_time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'stop_time must be HH:mm')
    .nullish()
    .transform((v) => v ?? null),
});

/**
 * Body for PUT /api/protected/mobile/plans/:planId — replace title, date, and
 * the whole ordered stop list in one call. The array order IS the stored
 * position, so add/reorder/remove/retime are all this same shape.
 */
export const updatePlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the plan a title')
    .max(120, 'Keep the title under 120 characters'),
  target_date: z.iso.date('target_date must be a YYYY-MM-DD date'),
  stops: z
    .array(planStopInputSchema)
    .max(100, 'A plan can have at most 100 stops'),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
