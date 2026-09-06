/**
 * PATCH /api/protected/mobile/me — the profile-save endpoint the mobile app
 * calls for name/phone/avatar edits.
 *
 * Regression test (2026-09-06): the PATCH select omitted `archived_at` while
 * the mobile Zod contract (`profileEnvelopeSchema`) requires it, so EVERY
 * save failed client-side validation even though the server persisted — the
 * app showed "Save failed" and avatar retries orphaned a file per attempt.
 * The supabase stub below behaves like PostgREST (returns only selected
 * columns), so the shape assertion pins the select list, not just the handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '253976a8-1a56-46f5-b895-8cbe79e3da99';

// Full profiles row as the DB holds it — the stub projects this down to the
// requested select list, exactly like PostgREST would.
const FULL_ROW: Record<string, unknown> = {
  id: USER_ID,
  email: 'testuser@ilokal.dev',
  full_name: 'Yummy',
  phone_number: null,
  avatar_url: null,
  role: 'app_user',
  status: 'active',
  archived_at: null,
  created_at: '2026-08-08T07:28:54.259503+00:00',
};

let lastUpdates: Record<string, unknown> | null = null;

function project(select: string): Record<string, unknown> {
  const cols = select.split(',').map((s) => s.trim());
  // Like PostgREST, the returned row reflects the applied update.
  const row = { ...FULL_ROW, ...(lastUpdates ?? {}) };
  return Object.fromEntries(cols.map((c) => [c, row[c] ?? null]));
}

function stubSupabase() {
  return {
    from: () => ({
      update: (updates: Record<string, unknown>) => {
        lastUpdates = updates;
        return {
          eq: () => ({
            select: (select: string) => ({
              single: async () => ({ data: project(select), error: null }),
            }),
          }),
        };
      },
    }),
  };
}

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { PATCH } from '../route';

const mockAuth = (authed: boolean) => {
  vi.mocked(getMobileUser).mockResolvedValueOnce(
    authed
      ? ({ user: { id: USER_ID }, token: 't', supabase: stubSupabase() } as never)
      : (null as never),
  );
};

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/protected/mobile/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  lastUpdates = null;
  vi.clearAllMocks();
});

describe('PATCH /api/protected/mobile/me', () => {
  it('rejects unauthenticated callers with 401', async () => {
    mockAuth(false);
    const res = await PATCH(patchRequest({ full_name: 'X' }));
    expect(res.status).toBe(401);
  });

  it('rejects an empty body with 400', async () => {
    mockAuth(true);
    const res = await PATCH(patchRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns the full contracted profile shape, including archived_at', async () => {
    mockAuth(true);
    const res = await PATCH(patchRequest({ full_name: 'YummyJr' }));
    expect(res.status).toBe(200);
    expect(lastUpdates).toEqual({ full_name: 'YummyJr' });
    const body = await res.json();
    // The mobile client validates this envelope with Zod — every key of
    // userProfileSchema must be present (nullable ok, absent not).
    for (const key of [
      'id',
      'email',
      'full_name',
      'phone_number',
      'avatar_url',
      'role',
      'status',
      'archived_at',
    ]) {
      expect(body.profile, `missing key: ${key}`).toHaveProperty(key);
    }
    expect(body.profile.full_name).toBe('YummyJr');
  });
});
