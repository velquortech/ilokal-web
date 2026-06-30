/**
 * Self-service account management: deactivate / reactivate / delete (archive).
 * These flip profiles.status (active|inactive) and the archived_at marker via the
 * caller's RLS-scoped client, with guards that stop a user self-clearing an
 * admin-imposed 'suspended' status or un-archiving a deleted account.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { POST as deactivate } from '../deactivate/route';
import { POST as reactivate } from '../reactivate/route';
import { DELETE as deleteAccount } from '../route';

const USER_ID = '11111111-0000-0000-0000-000000000001';

/**
 * Chainable Supabase stub. select/update/eq/is return the builder; the terminal
 * single()/maybeSingle() shift the next queued result, so a handler that reads
 * then writes consumes two queued rows in order.
 */
function makeSupabase(results: { data: unknown; error: unknown }[]) {
  const queue = [...results];
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  builder.select = vi.fn(ret);
  builder.update = vi.fn(ret);
  builder.eq = vi.fn(ret);
  builder.is = vi.fn(ret);
  const next = () =>
    Promise.resolve(queue.shift() ?? { data: null, error: null });
  builder.single = vi.fn(next);
  builder.maybeSingle = vi.fn(next);
  return { from: vi.fn(() => builder) };
}

function authWith(results: { data: unknown; error: unknown }[]) {
  return {
    user: { id: USER_ID },
    token: 'jwt',
    supabase: makeSupabase(results),
  };
}

const req = () => new NextRequest('http://localhost/api/protected/mobile/me');

beforeEach(() => vi.clearAllMocks());

describe('account management — auth', () => {
  it('deactivate returns 401 when unauthenticated', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null);
    expect((await deactivate(req())).status).toBe(401);
  });
});

describe('POST /me/deactivate', () => {
  it('deactivates an active account', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        { data: { status: 'active', archived_at: null }, error: null },
        {
          data: { id: USER_ID, status: 'inactive', archived_at: null },
          error: null,
        },
      ]),
    );
    const res = await deactivate(req());
    expect(res.status).toBe(200);
    expect((await res.json()).profile.status).toBe('inactive');
  });

  it('refuses to deactivate an admin-suspended account (403)', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        { data: { status: 'suspended', archived_at: null }, error: null },
      ]),
    );
    expect((await deactivate(req())).status).toBe(403);
  });

  it('refuses to deactivate an archived account (403)', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        {
          data: { status: 'inactive', archived_at: '2026-01-01T00:00:00Z' },
          error: null,
        },
      ]),
    );
    expect((await deactivate(req())).status).toBe(403);
  });
});

describe('POST /me/reactivate', () => {
  it('reactivates a self-deactivated account', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        { data: { status: 'inactive', archived_at: null }, error: null },
        {
          data: { id: USER_ID, status: 'active', archived_at: null },
          error: null,
        },
      ]),
    );
    const res = await reactivate(req());
    expect(res.status).toBe(200);
    expect((await res.json()).profile.status).toBe('active');
  });

  it('refuses to un-archive a deleted account (403)', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        {
          data: { status: 'inactive', archived_at: '2026-01-01T00:00:00Z' },
          error: null,
        },
      ]),
    );
    expect((await reactivate(req())).status).toBe(403);
  });
});

describe('DELETE /me (archive only)', () => {
  it('archives the account and reports archived: true', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(
      authWith([
        {
          data: {
            id: USER_ID,
            status: 'inactive',
            archived_at: '2026-06-24T00:00:00Z',
          },
          error: null,
        },
      ]),
    );
    const res = await deleteAccount(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.archived).toBe(true);
    expect(body.profile.archived_at).toBeTruthy();
  });
});
