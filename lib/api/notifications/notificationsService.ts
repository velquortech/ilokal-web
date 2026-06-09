import type {
  ApiResponse,
  NotificationPreferences,
  NotificationPage,
  NotificationListParams,
  EmitNotificationInput,
} from '@/lib/types';
import * as q from './notificationsQuery';

/** Keyset (cursor) page of a recipient's notifications. */
export async function listNotifications(
  user_id: string,
  params: NotificationListParams = {},
): Promise<ApiResponse<NotificationPage>> {
  try {
    const data = await q.fetchNotifications(user_id, params);
    return { success: true, data };
  } catch (error) {
    console.error('[notificationsService.listNotifications]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
      },
    };
  }
}

/** Unread count for a recipient. */
export async function getUnreadCount(
  user_id: string,
): Promise<ApiResponse<number>> {
  try {
    const count = await q.getUnreadCount(user_id);
    return { success: true, data: count };
  } catch (error) {
    console.error('[notificationsService.getUnreadCount]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to count unread' },
    };
  }
}

/** Emit a notification (admin/system → recipient) via the RPC. */
export async function emitNotification(
  input: EmitNotificationInput,
): Promise<ApiResponse<{ id: string }>> {
  try {
    const id = await q.emitNotification(input);
    if (!id)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Unable to create notification' },
      };
    return { success: true, data: { id } };
  } catch (error) {
    console.error('[notificationsService.emitNotification]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create notification',
      },
    };
  }
}

/** Mark one notification read. */
export async function markRead(id: string): Promise<ApiResponse<null>> {
  try {
    const ok = await q.markAsRead(id);
    if (!ok)
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      };
    return { success: true };
  } catch (error) {
    console.error('[notificationsService.markRead]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification' },
    };
  }
}

/** Mark all of a recipient's notifications read. */
export async function markAllRead(user_id: string): Promise<ApiResponse<null>> {
  try {
    const ok = await q.markAllAsRead(user_id);
    if (!ok)
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all read' },
      };
    return { success: true };
  } catch (error) {
    console.error('[notificationsService.markAllRead]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all read' },
    };
  }
}

export async function getPreferences(
  user_id: string,
): Promise<ApiResponse<NotificationPreferences | null>> {
  try {
    const prefs = await q.getPreferences(user_id);
    return { success: true, data: prefs };
  } catch (error) {
    console.error('[notificationsService.getPreferences]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch preferences' },
    };
  }
}

export async function upsertPreferences(
  user_id: string,
  prefs: Partial<NotificationPreferences>,
): Promise<ApiResponse<NotificationPreferences | null>> {
  try {
    const data = await q.upsertPreferences(user_id, prefs);
    if (!data)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Failed to save preferences' },
      };
    return { success: true, data };
  } catch (error) {
    console.error('[notificationsService.upsertPreferences]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save preferences' },
    };
  }
}
