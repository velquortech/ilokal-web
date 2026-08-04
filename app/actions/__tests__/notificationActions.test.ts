/**
 * Business notification action tests — auth guard + delegation to the service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@/lib/types/user';
import type { NotificationPage } from '@/lib/types';

const getCurrentUser = vi.fn();
const listNotifications = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock('@/lib/api/getCurrentUser', () => ({
  getCurrentUser: () => getCurrentUser(),
}));
vi.mock('@/lib/api/notifications/notificationsService', () => ({
  listNotifications: (userId: string, params: unknown) =>
    listNotifications(userId, params),
  markRead: (id: string) => markRead(id),
  markAllRead: (userId: string) => markAllRead(userId),
}));

import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '../notificationActions';

const user: User = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'owner@example.com',
  full_name: 'Owner',
  phone_number: null,
  role: 'business_owner',
  avatar_url: null,
};

const NOTIF_ID = '77777777-7777-4777-8777-777777777777';

const page: NotificationPage = {
  notifications: [],
  next_cursor: null,
  unread_count: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  listNotifications.mockResolvedValue({ success: true, data: page });
  markRead.mockResolvedValue({ success: true });
  markAllRead.mockResolvedValue({ success: true });
});

describe('getNotificationsAction', () => {
  it('returns unauthorized when no session', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await getNotificationsAction();
    expect(result.success).toBe(false);
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it('delegates cursor + limit to the service for the current user', async () => {
    const cursor = 'abc';
    const result = await getNotificationsAction({ cursor, limit: 15 });
    expect(result.success).toBe(true);
    expect(listNotifications).toHaveBeenCalledWith(user.id, {
      cursor,
      limit: 15,
    });
  });
});

describe('markNotificationReadAction', () => {
  it('returns unauthorized when no session', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await markNotificationReadAction(NOTIF_ID);
    expect(result.success).toBe(false);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('rejects an invalid notification id', async () => {
    const result = await markNotificationReadAction('not-a-uuid');
    expect(result.success).toBe(false);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('marks a valid notification read', async () => {
    const result = await markNotificationReadAction(NOTIF_ID);
    expect(result.success).toBe(true);
    expect(markRead).toHaveBeenCalledWith(NOTIF_ID);
  });
});

describe('markAllNotificationsReadAction', () => {
  it('marks all read for the current user', async () => {
    const result = await markAllNotificationsReadAction();
    expect(result.success).toBe(true);
    expect(markAllRead).toHaveBeenCalledWith(user.id);
  });

  it('returns unauthorized when no session', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await markAllNotificationsReadAction();
    expect(result.success).toBe(false);
    expect(markAllRead).not.toHaveBeenCalled();
  });
});
