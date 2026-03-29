import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as q from '@/lib/api/notifications/notificationsQuery';
import * as svc from '@/lib/api/notifications/notificationsService';

vi.mock('@/lib/api/notifications/notificationsQuery');

describe('notificationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listNotifications returns paginated data', async () => {
    const mock = { items: [{ id: 'n1' }], total: 1, page: 1, per_page: 20 };
    vi.mocked(q.fetchNotifications).mockResolvedValueOnce(
      mock as unknown as Awaited<ReturnType<typeof q.fetchNotifications>>,
    );
    const res = await svc.listNotifications('u1');
    expect(res.success).toBe(true);
    expect(res.data?.items).toHaveLength(1);
  });

  it('createNotification returns conflict when create fails', async () => {
    vi.mocked(q.createNotification).mockResolvedValueOnce(
      null as unknown as Awaited<ReturnType<typeof q.createNotification>>,
    );
    const res = await svc.createNotification({ title: 'Hi' });
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
