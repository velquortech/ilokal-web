import { describe, it, expect, vi, beforeEach } from 'vitest';
import { config as proxyConfig } from '@/proxy';
import { isProtectedPath } from '@/lib/utils/protectedRoutes';
import { ROUTES } from '@/config/routeConfig';

/**
 * Regression net for "Cookies can only be modified in a Server Action or Route
 * Handler" on /explore.
 *
 * Two independent faults produced it:
 *   1. `createServerSupabaseClient().setAll` wrote straight to the request
 *      cookie store. In an RSC that store is read-only, so auth-js rotating an
 *      expiring access token threw — and `getCurrentUser()`'s catch turned the
 *      throw into `null`, rendering a live session as signed-out.
 *   2. /explore wasn't in the proxy matcher, so nothing refreshed the token on
 *      a mutable response either. Swallowing (1) is only safe BECAUSE (2) does
 *      the real write — the two fixes are load-bearing together.
 */

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  getAll: vi.fn(() => []),
}));

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

type CookieHandlers = {
  getAll: () => unknown[];
  setAll: (
    cookies: {
      name: string;
      value: string;
      options: Record<string, unknown>;
    }[],
  ) => void;
};

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/ssr', () => ({
  createServerClient: (url: string, key: string, opts: unknown) =>
    createServerClient(url, key, opts),
}));

import { createServerSupabaseClient } from '@/supabase/server';

/** The cookie adapter handed to @supabase/ssr on the last client construction. */
function lastHandlers(): CookieHandlers {
  const [, , opts] = createServerClient.mock.calls.at(-1)!;
  return (opts as { cookies: CookieHandlers }).cookies;
}

beforeEach(() => {
  vi.clearAllMocks();
  createServerClient.mockReturnValue({});
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
});

describe('createServerSupabaseClient — read-only cookie store', () => {
  it('does not throw when the RSC cookie store rejects a write', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error(
        'Cookies can only be modified in a Server Action or Route Handler',
      );
    });

    await createServerSupabaseClient();

    expect(() =>
      lastHandlers().setAll([
        { name: 'sb-access-token', value: 'rotated', options: {} },
      ]),
    ).not.toThrow();
  });

  it('still writes when the store is mutable (Server Action / Route Handler)', async () => {
    cookieStore.set.mockImplementation(() => undefined);

    await createServerSupabaseClient();
    lastHandlers().setAll([
      { name: 'sb-access-token', value: 'rotated', options: {} },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith(
      'sb-access-token',
      'rotated',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('abandons the rest of the batch after the first rejected write', async () => {
    // Documents the accepted trade-off: the whole batch is abandoned on the
    // first failure. Safe only because the proxy re-writes the same set.
    cookieStore.set.mockImplementation(() => {
      throw new Error('read-only');
    });

    await createServerSupabaseClient();
    lastHandlers().setAll([
      { name: 'sb-access-token.0', value: 'a', options: {} },
      { name: 'sb-access-token.1', value: 'b', options: {} },
    ]);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
  });
});

describe('proxy matcher — explore', () => {
  it('matches the explore surface so its session cookies get refreshed', () => {
    expect(proxyConfig.matcher).toContain(ROUTES.EXPLORE.HOME);
    expect(proxyConfig.matcher).toContain('/explore/:path+');
  });

  it('leaves explore unprotected — refresh only, no redirect or role gate', () => {
    expect(isProtectedPath(ROUTES.EXPLORE.HOME)).toBe(false);
    expect(isProtectedPath(ROUTES.EXPLORE.NEARBY)).toBe(false);
    expect(isProtectedPath(ROUTES.EXPLORE.DEALS)).toBe(false);
    expect(isProtectedPath('/explore/some-business-id')).toBe(false);
  });
});
