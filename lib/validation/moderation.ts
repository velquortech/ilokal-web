import { z } from 'zod';

export const createReportSchema = z.object({
  reporter_id: z.string().uuid(),
  target_type: z.enum(['user', 'business', 'content', 'coupon', 'product']),
  target_id: z.string().uuid(),
  reason: z.string().max(200),
  details: z.string().max(2000).optional().nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const moderationActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate', 'dismiss']),
  comment: z.string().max(1000).optional().nullable(),
});

export type ModerationActionInput = z.infer<typeof moderationActionSchema>;

export const suspendSchema = z.object({
  target_type: z.enum(['user', 'business']),
  reason: z.string().max(1000).optional().nullable(),
  until: z.string().optional().nullable(),
});

export type SuspendInput = z.infer<typeof suspendSchema>;

export const warnSchema = z.object({
  target_type: z.enum(['user', 'business']),
  message: z.string().max(1000),
});

export type WarnInput = z.infer<typeof warnSchema>;
