import http from './client';
import type {
  ApiResponse,
  PaginatedNotificationsResponse,
  NotificationPreferences,
} from '@/lib/types';

const notificationService = {
  async list() {
    if (typeof window === 'undefined') {
      const svc = await import('@/lib/api/notifications/notificationsService');
      const userMod = await import('@/lib/api/getCurrentUser');
      const user = await userMod.getCurrentUser();
      if (!user)
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        } as ApiResponse<PaginatedNotificationsResponse>;
      return await svc.listNotifications(user.id);
    }
    return await http.get('/notifications');
  },

  async get(id: string) {
    return await http.get(`/notifications/${id}`);
  },

  async preferences() {
    if (typeof window === 'undefined') {
      const svc = await import('@/lib/api/notifications/notificationsService');
      const userMod = await import('@/lib/api/getCurrentUser');
      const user = await userMod.getCurrentUser();
      if (!user)
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        } as ApiResponse<NotificationPreferences | null>;
      return await svc.getPreferences(user.id);
    }
    return await http.get('/notifications/preferences');
  },
};

export default notificationService;
