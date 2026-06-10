'use server';

import { getCurrentUser } from '@/lib/api/getCurrentUser';
import * as notificationsService from '@/lib/api/notifications/notificationsService';
import type {
  ApiResponse,
  NotificationPage,
  NotificationListParams,
} from '@/lib/types';
import {
  notificationListQuerySchema,
  markNotificationReadSchema,
} from '@/lib/validation/notification';

const UNAUTHORIZED = {
  success: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
};

/**
 * Keyset (cursor) page of the current user's notifications for the dashboard
 * bell. RLS scopes rows to the authenticated user.
 */
export async function getNotificationsAction(
  params: NotificationListParams = {},
): Promise<ApiResponse<NotificationPage>> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;

  const parsed = notificationListQuerySchema.safeParse({
    cursor: params.cursor ?? undefined,
    limit: params.limit,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid params' },
    };
  }

  return notificationsService.listNotifications(user.id, {
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  });
}

/** Mark one notification read (RLS guarantees ownership). */
export async function markNotificationReadAction(
  id: string,
): Promise<ApiResponse<null>> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;

  const parsed = markNotificationReadSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid notification id' },
    };
  }

  return notificationsService.markRead(parsed.data.id);
}

/** Mark every unread notification of the current user read. */
export async function markAllNotificationsReadAction(): Promise<
  ApiResponse<null>
> {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;

  return notificationsService.markAllRead(user.id);
}
