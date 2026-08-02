import { z } from 'zod';
import { NOTIFICATION_TYPES } from '@/lib/types/notification';

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
});

export const markReadSchema = z.object({
  read: z.boolean(),
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  digest: z.enum(['daily', 'weekly', 'none']),
});

export const createNotificationSchema = z.object({
  user_id: z.guid(),
  title: z.string().max(200),
  body: z.string().max(2000),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// ---------------------------------------------------------------------------
// Keyset (cursor) pagination + document-decision schemas
// ---------------------------------------------------------------------------

/** Notification feed query (keyset cursor pagination). */
export const notificationListQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** Mark a single notification read (by id). */
export const markNotificationReadSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/** Notification type enum (mirrors the DB CHECK + NOTIFICATION_TYPES). */
/**
 * Derived from the runtime constant, not restated. The two lists were separate
 * copies of the same set, which is how a type ends up valid in one layer and
 * rejected in the next.
 */
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

/** Emit a notification (admin/system → recipient). */
export const emitNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
  actor_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * An admin's approve/reject decision, for ANY review queue.
 *
 * Remarks are optional on approve and required on reject, so the person on the
 * receiving end always gets a reason they can act on. Written once because the
 * rule is the same whether the thing being reviewed is a document or an event
 * — forking it is how one queue quietly stops requiring a reason.
 */
export const reviewDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    remarks: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.decision === 'approve' ||
      (typeof v.remarks === 'string' && v.remarks.length > 0),
    {
      message: 'A reason is required when rejecting',
      path: ['remarks'],
    },
  );

/** Original name, kept so existing document-review call sites do not change. */
export const documentDecisionSchema = reviewDecisionSchema;

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type DocumentDecision = ReviewDecision;
