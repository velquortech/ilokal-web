import type {
  ApiResponse,
  BusinessSettings,
  NotificationPreferences,
} from '@/lib/types';
import type { UpdateBusinessSettingsInput } from '@/lib/validation/settings';
import * as q from './settingsQuery';

export async function getBusinessSettingsService(
  businessId: string,
): Promise<ApiResponse<BusinessSettings | null>> {
  try {
    const data = await q.getBusinessSettings(businessId);
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load business settings',
      },
    };
  }
}

export async function upsertBusinessSettingsService(
  businessId: string,
  input: UpdateBusinessSettingsInput,
): Promise<ApiResponse<BusinessSettings>> {
  try {
    const data = await q.upsertBusinessSettings(businessId, input);
    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to save business settings';
    return { success: false, error: { code: 'DB_ERROR', message } };
  }
}

export async function getNotificationPreferencesService(
  userId: string,
): Promise<ApiResponse<NotificationPreferences | null>> {
  try {
    const data = await q.getNotificationPreferences(userId);
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load notification preferences',
      },
    };
  }
}

export async function upsertNotificationPreferencesService(
  userId: string,
  input: Pick<NotificationPreferences, 'email' | 'push' | 'digest'>,
): Promise<ApiResponse<NotificationPreferences>> {
  try {
    const data = await q.upsertNotificationPreferences(userId, input);
    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to save notification preferences';
    return { success: false, error: { code: 'DB_ERROR', message } };
  }
}
