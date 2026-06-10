import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as q from '@/lib/api/notifications/notificationsQuery';
import * as svc from '@/lib/api/notifications/notificationsService';

vi.mock('@/lib/api/notifications/notificationsQuery');

describe('notificationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listNotifications returns a keyset page', async () => {
    const mock = {
      notifications: [
        {
          id: 'n1',
          user_id: 'u1',
          type: 'system',
          title: 'Hi',
          body: null,
          business_id: null,
          actor_id: null,
          metadata: {},
          read_at: null,
          created_at: '2026-06-09T00:00:00Z',
        },
      ],
      next_cursor: null,
      unread_count: 1,
    };
    vi.mocked(q.fetchNotifications).mockResolvedValueOnce(
      mock as unknown as Awaited<ReturnType<typeof q.fetchNotifications>>,
    );
    const res = await svc.listNotifications('u1');
    expect(res.success).toBe(true);
    expect(res.data?.notifications).toHaveLength(1);
    expect(res.data?.unread_count).toBe(1);
  });

  it('emitNotification returns conflict when create fails', async () => {
    vi.mocked(q.emitNotification).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof q.emitNotification>>,
    );
    const res = await svc.emitNotification({
      user_id: '22222222-2222-4222-8222-222222222222',
      type: 'system',
      title: 'Hi',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
  });

  it('markRead returns not_found when id missing', async () => {
    vi.mocked(q.markAsRead).mockResolvedValueOnce(
      false as unknown as Awaited<ReturnType<typeof q.markAsRead>>,
    );
    const res = await svc.markRead('x');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('getPreferences returns preferences', async () => {
    const prefs = { email: true, push: false };
    vi.mocked(q.getPreferences).mockResolvedValueOnce(
      prefs as unknown as Awaited<ReturnType<typeof q.getPreferences>>,
    );
    const res = await svc.getPreferences('u1');
    expect(res.success).toBe(true);
    expect(res.data).toEqual(prefs);
  });

  it('upsertPreferences returns conflict when upsert fails', async () => {
    vi.mocked(q.upsertPreferences).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof q.upsertPreferences>>,
    );
    const res = await svc.upsertPreferences('u1', { email: true });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
  });
});
