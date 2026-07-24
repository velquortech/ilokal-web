/**
 * signOutAction — the redirect-less sign-out Server Action.
 *
 * The contract under test: `ok` is true only when the browser is guaranteed to
 * no longer hold a Supabase session. auth-js RETURNS `{ error }` rather than
 * throwing, and on a non-401/403/404 failure it bails before removing the local
 * session — so the action must expire the `sb-*` cookies itself.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { signOutAction } from '@/app/(auth)/actions/authActions';
import { createServerSupabaseClient } from '@/supabase/server';
import { cookies } from 'next/headers';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

function mockSupabase(signOut: Mock): SupabaseClient {
  return { auth: { signOut } } as unknown as SupabaseClient;
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

  it('returns ok on a clean sign-out and does not touch cookies', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      mockSupabase(signOut),
    );
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(set).not.toHaveBeenCalled();
  });

  it('expires every sb-* cookie (incl. chunks) when the revoke returns an error', async () => {
    const signOut = vi
      .fn()
      .mockResolvedValue({ error: { message: 'gotrue unavailable' } });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      mockSupabase(signOut),
    );
    const set = mockCookieStore([
      'sb-abc-auth-token.0',
      'sb-abc-auth-token.1',
      'unrelated-cookie',
    ]);

    await expect(signOutAction()).resolves.toEqual({ ok: true });

    const cleared = set.mock.calls.map((call) => call[0]);
    expect(cleared).toEqual(['sb-abc-auth-token.0', 'sb-abc-auth-token.1']);
    for (const call of set.mock.calls) {
      expect(call[1]).toBe('');
      expect(call[2]).toMatchObject({ maxAge: 0, path: '/' });
    }
  });

  it('expires the cookies when creating the client throws', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValue(
      new Error('missing env'),
    );
    const set = mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({ ok: true });
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('reports ok:false when neither the revoke nor the cookie clear works', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      mockSupabase(signOut),
    );
    (cookies as unknown as Mock).mockRejectedValue(new Error('no store'));

    await expect(signOutAction()).resolves.toEqual({ ok: false });
  });

  it('never throws — the result flag is the only failure signal', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('network'));
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      mockSupabase(signOut),
    );
    mockCookieStore(['sb-abc-auth-token']);

    await expect(signOutAction()).resolves.toEqual({ ok: true });
  });
});
