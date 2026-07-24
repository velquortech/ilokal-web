/**
 * signOutAction — the redirect-less sign-out Server Action.
 *
 * The contract under test:
 * - `ok`      — the browser no longer holds a Supabase session cookie.
 * - `revoked` — the tokens were confirmed revoked server-side.
 *
 * auth-js RETURNS `{ error }` rather than throwing, and on a non-401/403/404
 * failure it bails before removing the local session — so the action must retry
 * the revoke with the service-role client and then expire the `sb-*` cookies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { signOutAction } from '@/app/(auth)/actions/authActions';
import {
  createServerSupabaseClient,
  createServerAdminClient,
} from '@/supabase/server';
import { cookies } from 'next/headers';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServerAdminClient: vi.fn(),
  SUPABASE_COOKIE_PREFIX: 'sb-',
  SUPABASE_COOKIE_OPTIONS: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
  },
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;
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

function mockAdmin(adminSignOut: Mock) {
  (createServerAdminClient as unknown as Mock).mockResolvedValue({
    auth: { admin: { signOut: adminSignOut } },
  } as unknown as AdminClient);
  return adminSignOut;
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
    expect(createServerAdminClient).not.toHaveBeenCalled();
  });

  it('retries the revoke via the admin client when the cookie client fails', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({ error: { message: 'gotrue 500' } }),
    );
    const adminSignOut = mockAdmin(vi.fn().mockResolvedValue({ error: null }));
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({ ok: true, revoked: true });
    expect(adminSignOut).toHaveBeenCalledWith(TOKEN, 'global');
    // Cookies are cleared regardless, since the cookie client did not do it.
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('reports revoked:false when the admin retry also fails', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({ error: { message: 'gotrue 500' } }),
    );
    mockAdmin(vi.fn().mockResolvedValue({ error: { message: 'still down' } }));
    mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
  });

  it('expires every sb-* cookie (incl. chunks) and leaves others alone', async () => {
    mockSupabase(vi.fn().mockResolvedValue({ error: { message: 'boom' } }));
    mockAdmin(vi.fn().mockResolvedValue({ error: { message: 'boom' } }));
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
      // Deletion matches on name + domain + path, so the write attributes must
      // be reused — a mismatch would silently leave the original cookie alive.
      expect(call[2]).toMatchObject({
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }
  });

  it('skips the admin retry when there is no session token to revoke', async () => {
    mockSupabase(
      vi.fn().mockResolvedValue({ error: { message: 'boom' } }),
      null,
    );
    mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({
      ok: true,
      revoked: false,
    });
    expect(createServerAdminClient).not.toHaveBeenCalled();
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
    mockAdmin(vi.fn().mockResolvedValue({ error: { message: 'boom' } }));
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
