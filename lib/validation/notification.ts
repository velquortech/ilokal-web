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
