import { z } from 'zod';

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
export const notificationTypeSchema = z.enum([
  'business_document_approved',
  'business_document_rejected',
  'business_verified',
  'business_rejected',
  'coupon_redeemed',
  'system',
]);

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
 * Admin document decision. Remarks are optional on approve but required on
 * reject (so the business owner always gets a reason).
 */
export const documentDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    remarks: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.decision === 'approve' ||
      (typeof v.remarks === 'string' && v.remarks.length > 0),
    {
      message: 'Remarks are required when disapproving documents',
      path: ['remarks'],
    },
  );

export type DocumentDecision = z.infer<typeof documentDecisionSchema>;
