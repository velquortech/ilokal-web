/**
 * signOutAction — the redirect-less sign-out Server Action.
 *
 * The contract under test:
 * - `ok`      — the browser no longer holds a Supabase session cookie.
 * - `revoked` — a revoke was issued for a real session token and auth-js did
 *               not report a failure (NOT a hard guarantee — it swallows
 *               401/403/404, and returns early when there is no session).
 *
 * auth-js RETURNS `{ error }` rather than throwing, and on a non-401/403/404
 * failure it bails before removing the local session — so the action must
 * expire the `sb-*` cookies itself and report `revoked: false`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { signOutAction } from '@/app/(auth)/actions/authActions';
import {
  createServerSupabaseClient,
  SUPABASE_COOKIE_OPTIONS,
} from '@/supabase/server';
import { cookies } from 'next/headers';

// Only the client factory is faked — the cookie constants come through REAL, so
// the "clear reuses the write attributes" assertion below actually guards
// `supabase/server.ts` instead of validating a copy of itself.
vi.mock('@/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/supabase/server')>();
  return { ...actual, createServerSupabaseClient: vi.fn() };
});
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

const TOKEN = 'access-token-123';

function mockSupabase(signOut: Mock, accessToken: string | null = TOKEN) {
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
      signOut,
    },
  } as unknown as SupabaseClient;
  (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);
  return client;
}

function mockCookieStore(names: string[]) {
  const set = vi.fn();
  const store = {
    getAll: () => names.map((name) => ({ name, value: 'v' })),
    set,
  } as unknown as CookieStore;
  (cookies as unknown as Mock).mockResolvedValue(store);
  return set;
}

describe('signOutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns ok+revoked on a clean sign-out and does not touch cookies', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockSupabase(signOut);
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({ ok: true, revoked: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(set).not.toHaveBeenCalled();
  });

  it('reports revoked:false when there was no session to revoke', async () => {
    // auth-js returns `error: null` without issuing any HTTP call when there is
    // no session, so a clean result alone does not prove a revoke happened.
    mockSupabase(vi.fn().mockResolvedValue({ error: null }), null);
    mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
  });

  it('reports revoked:false when the revoke fails (cookies cleared only)', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({ error: { message: 'gotrue 500' } }),
    );
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('expires every sb-* cookie (incl. chunks) and leaves others alone', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'boom' } }));
    const set = mockCookieStore([
      'sb-abc-auth-token.0',
      'sb-abc-auth-token.1',
      'sb-abc-auth-token-code-verifier',
      'unrelated-cookie',
    ]);

    await signOutAction();

    expect(set.mock.calls.map((call) => call[0])).toEqual([
      'sb-abc-auth-token.0',
      'sb-abc-auth-token.1',
      'sb-abc-auth-token-code-verifier',
    ]);
    for (const call of set.mock.calls) {
      expect(call[1]).toBe('');
      // Deletion matches on name + domain + path, so the clear MUST reuse the
      // real write attributes — a mismatch silently leaves the cookie alive.
      // These come from `supabase/server.ts` itself, not a copy.
      expect(call[2]).toMatchObject({ ...SUPABASE_COOKIE_OPTIONS, maxAge: 0 });
    }
  });

  it('expires the cookies when creating the client throws', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValue(
      new Error('missing env'),
    );
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('reports ok:false when neither the revoke nor the cookie clear works', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'boom' } }));
    (cookies as unknown as Mock).mockRejectedValue(new Error('no store'));

    await expect(signOutAction()).resolves.toEqual({
      ok: false,
      revoked: false,
    });
  });

  it('never throws — the result flags are the only failure signal', async () => {
    mockSupabase(vi.fn().mockRejectedValue(new Error('network')));
    mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
  });
});
