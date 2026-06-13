/**
 * Notifications keyset query integration tests.
 *
 * Exercises the real `fetchNotifications` / `emitNotification` / mark-read paths
 * against a chainable Supabase mock:
 *  - the list builder is thenable (resolves the page rows on `await`)
 *  - `.is(...)` resolves the unread `count`
 *  - `.rpc(...)` / `.update(...)` resolve their own results
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import {
  fetchNotifications,
  emitNotification,
  markAsRead,
  markAllAsRead,
} from '../notificationsQuery';
import { decodeCursor } from '@/lib/utils/cursor';
import type { Notification } from '@/lib/types';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const USER = 'user-1';

function makeRow(id: string, created_at: string): Notification {
  return {
    id,
    user_id: USER,
    type: 'system',
    title: `Notification ${id}`,
    body: null,
    business_id: null,
    actor_id: null,
    metadata: {},
    read_at: null,
    created_at,
  };
}

interface MockBuilder {
  select: Mock;
  eq: Mock;
  order: Mock;
  limit: Mock;
  or: Mock;
  is: Mock;
  update: Mock;
  rpc: Mock;
  from: Mock;
  then: (resolve: (v: { data: Notification[]; error: null }) => void) => void;
}

/**
 * Build a chainable client. `listData` is what an awaited list query yields;
 * `count` is what `.is(...)` (the unread count) yields.
 */
function makeClient(listData: Notification[], count: number) {
  const builder: Partial<MockBuilder> = {};
  const chain = () => builder as MockBuilder;

  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.or = vi.fn(chain);
  builder.update = vi.fn(chain);
  // unread count terminal
  builder.is = vi.fn().mockResolvedValue({ count, error: null });
  // makes the list builder awaitable
  builder.then = (resolve) => resolve({ data: listData, error: null });

  const client = {
    from: vi.fn(() => builder as MockBuilder),
    rpc: vi.fn().mockResolvedValue({ data: 'new-id', error: null }),
  };
  return { client, builder: builder as MockBuilder };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchNotifications (keyset)', () => {
  it('returns a full page + next_cursor when there are more rows', async () => {
    // limit 2 → fetch 3; 3 returned means hasMore, page is first 2
    const rows = [
      makeRow('c', '2026-06-09T03:00:00Z'),
      makeRow('b', '2026-06-09T02:00:00Z'),
      makeRow('a', '2026-06-09T01:00:00Z'),
    ];
    const { client } = makeClient(rows, 5);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const page = await fetchNotifications(USER, { limit: 2 });

    expect(page.notifications).toHaveLength(2);
    expect(page.unread_count).toBe(5);
    expect(page.next_cursor).not.toBeNull();
    // cursor points at the last KEPT row (id 'b')
    expect(decodeCursor(page.next_cursor)).toEqual({
      created_at: '2026-06-09T02:00:00Z',
      id: 'b',
    });
  });

  it('returns null next_cursor when the page is not full', async () => {
    const rows = [makeRow('b', '2026-06-09T02:00:00Z')];
    const { client } = makeClient(rows, 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const page = await fetchNotifications(USER, { limit: 2 });

    expect(page.notifications).toHaveLength(1);
    expect(page.next_cursor).toBeNull();
  });

  it('applies a keyset .or() filter when a cursor is supplied', async () => {
    const { client, builder } = makeClient([], 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const cursor = Buffer.from('2026-06-09T02:00:00Z|b', 'utf8').toString(
      'base64url',
    );
    await fetchNotifications(USER, { limit: 2, cursor });

    expect(builder.or).toHaveBeenCalledTimes(1);
    const filter = (builder.or as Mock).mock.calls[0][0] as string;
    expect(filter).toContain('created_at.lt.2026-06-09T02:00:00Z');
    expect(filter).toContain('id.lt.b');
  });

  it('does not apply .or() on the first page (no cursor)', async () => {
    const { client, builder } = makeClient([], 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await fetchNotifications(USER, { limit: 2 });

    expect(builder.or).not.toHaveBeenCalled();
  });
});

describe('emitNotification', () => {
  it('calls the create_notification RPC with mapped params', async () => {
    const { client } = makeClient([], 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const id = await emitNotification({
      user_id: USER,
      type: 'business_document_rejected',
      title: 'Documents need attention',
      body: 'See remarks',
      business_id: 'biz-1',
      actor_id: 'admin-1',
      metadata: { remarks: 'expired tax cert' },
    });

    expect(id).toBe('new-id');
    expect(client.rpc).toHaveBeenCalledWith('create_notification', {
      p_user_id: USER,
      p_type: 'business_document_rejected',
      p_title: 'Documents need attention',
      p_body: 'See remarks',
      p_business_id: 'biz-1',
      p_actor_id: 'admin-1',
      p_metadata: { remarks: 'expired tax cert' },
    });
  });
});

describe('markAsRead / markAllAsRead', () => {
  it('marks a single notification read via update + is(read_at,null)', async () => {
    const { client, builder } = makeClient([], 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const ok = await markAsRead('notif-1');

    expect(ok).toBe(true);
    expect(builder.update).toHaveBeenCalledTimes(1);
    const patch = (builder.update as Mock).mock.calls[0][0] as {
      read_at: string;
    };
    expect(typeof patch.read_at).toBe('string');
    expect(builder.is).toHaveBeenCalledWith('read_at', null);
  });

  it('marks all read scoped to the user', async () => {
    const { client, builder } = makeClient([], 0);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const ok = await markAllAsRead(USER);

    expect(ok).toBe(true);
    expect(builder.update).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('user_id', USER);
    expect(builder.is).toHaveBeenCalledWith('read_at', null);
  });
});
