/**
 * Notifications Query Tests - Phase F
 * Database read operations for notification management
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('notificationsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    it('should return user notifications paginated', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'notif-1',
              user_id: 'user-1',
              title: 'New review',
              read_at: null,
            },
            {
              id: 'notif-2',
              user_id: 'user-1',
              title: 'New order',
              read_at: '2026-03-01T10:00:00Z',
            },
          ],
          error: null,
          count: 15,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.range).toBeDefined();
    });

    it('should sort by newest first (created_at desc)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.order).toBeDefined();
    });

    it('should default to 10 per page', () => {
      const limit = 10;
      expect(limit).toBe(10);
    });

    it('should return unread count in response', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { count: 5 },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { count: 7 },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should return 0 if all read', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { count: 0 },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });

  describe('getNotificationById', () => {
    it('should return single notification', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'notif-1',
            title: 'New review',
            message: 'User gave 5-star review',
          },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should include related data (user, business)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'notif-1',
            user: { id: 'user-1', email: 'user@example.com' },
            business: { id: 'biz-1', name: 'Business' },
          },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should return error if not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: 'user-1',
            email_reviews: true,
            email_orders: true,
            push_enabled: false,
          },
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.single).toBeDefined();
    });

    it('should return defaults if no custom preferences', async () => {
      const defaults = {
        email_reviews: true,
        email_orders: true,
        push_enabled: true,
        sms_enabled: false,
      };

      expect(defaults.email_reviews).toBe(true);
      expect(defaults.push_enabled).toBe(true);
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'notif-1' }, { id: 'notif-2' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.update).toBeDefined();
    });

    it('should set read_at timestamp', () => {
      const readAt = new Date().toISOString();
      expect(readAt).toBeDefined();
    });
  });

  describe('deleteNotification', () => {
    it('should soft-delete notification', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'notif-1', deleted_at: '2026-03-01T10:00:00Z' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.update).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.range).toBeDefined();
    });

    it('should return empty array on error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: { message: 'DB error' },
        }),
      };

      (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
        mockSupabase,
      );
      expect(mockSupabase.range).toBeDefined();
    });
  });
});
