import type {
  ApiResponse,
  NotificationPreferences,
  PaginatedNotificationsResponse,
  CreateNotificationRequest,
  Notification,
} from '@/lib/types';
import * as q from './notificationsQuery';

export async function listNotifications(
  user_id: string,
  page = 1,
  per_page = 20,
): Promise<ApiResponse<PaginatedNotificationsResponse>> {
  try {
    const res = await q.fetchNotifications(user_id, page, per_page);
    return {
      success: true,
      data: {
        items: res.items,
        total: res.total,
        page: res.page,
        per_page: res.per_page,
      },
    };
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

export async function createNotification(
  input: Partial<CreateNotificationRequest>,
): Promise<ApiResponse<Notification | null>> {
  try {
    const data = await q.createNotification(input as Partial<Notification>);
    if (!data)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Unable to create notification' },
      };
    return { success: true, data };
  } catch (error) {
    console.error('[notificationsService.createNotification]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create notification',
      },
    };
  }
}

export async function markRead(
  id: string,
  read = true,
): Promise<ApiResponse<null>> {
  try {
    const ok = await q.markAsRead(id, read);
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
