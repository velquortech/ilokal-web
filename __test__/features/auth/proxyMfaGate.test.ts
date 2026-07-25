import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { ROUTES } from '@/config/routeConfig';
import { SUPABASE_COOKIE_PREFIX } from '@/supabase/cookies';

/**
 * The proxy's MFA-elevation gate. Both sign-in doors establish the session
 * BEFORE the TOTP step, so an abandoned challenge leaves a valid AAL1 cookie on
 * an MFA-enrolled account — nothing downstream checks AAL, which made the
 * second factor advisory. These cover the gate and, just as important, that it
 * fails OPEN for every non-enrolled shape.
 */

type AALResult = {
  currentLevel: string | null;
  nextLevel: string | null;
} | null;

const createServerClient = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

vi.mock('@/app/api/helpers/rateLimit', () => ({
  clientIp: () => '127.0.0.1',
  rateLimit: () => ({ allowed: true }),
}));

import { proxy } from '@/proxy';

const USER = {
  id: 'user-1',
  app_metadata: { role: 'admin', status: 'active' },
};

function buildClient(aal: AALResult) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: USER } }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi
          .fn()
          .mockResolvedValue({ data: aal, error: null }),
      },
    },
    from: vi.fn(),
  };
}

function requestFor(pathname: string) {
  const request = new NextRequest(`https://app.test${pathname}`);
  request.cookies.set(`${SUPABASE_COOKIE_PREFIX}test-auth-token`, 'jwt-value');
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key';
});

describe('proxy MFA elevation gate', () => {
  it('redirects a half-authenticated (aal1) session off a protected page', async () => {
    createServerClient.mockReturnValue(
      buildClient({ currentLevel: 'aal1', nextLevel: 'aal2' }),
    );

    const response = await proxy(requestFor('/admin'));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location') as string);
    expect(location.pathname).toBe(ROUTES.AUTH.SIGN_IN);
    expect(location.searchParams.get('mfa')).toBe('required');
  });

  it('expires the Supabase auth cookies on that redirect', async () => {
    createServerClient.mockReturnValue(
      buildClient({ currentLevel: 'aal1', nextLevel: 'aal2' }),
    );

    const response = await proxy(requestFor('/business'));

    const cleared = response.cookies.get(
      `${SUPABASE_COOKIE_PREFIX}test-auth-token`,
    );
    expect(cleared?.value).toBe('');
    expect(cleared?.maxAge).toBe(0);
  });

  it('lets an elevated (aal2) session through', async () => {
    createServerClient.mockReturnValue(
      buildClient({ currentLevel: 'aal2', nextLevel: 'aal2' }),
    );

    const response = await proxy(requestFor('/admin'));

    expect(response.status).toBe(200);
  });

  it('lets an account with no enrolled factor through', async () => {
    createServerClient.mockReturnValue(
      buildClient({ currentLevel: 'aal1', nextLevel: 'aal1' }),
    );

    const response = await proxy(requestFor('/admin'));

    expect(response.status).toBe(200);
  });

  it('fails open when the assurance level is unknown', async () => {
    // No session data / an auth-js error must never lock a user out.
    createServerClient.mockReturnValue(buildClient(null));

    const response = await proxy(requestFor('/admin'));

    expect(response.status).toBe(200);
  });

  it('does not gate public pages', async () => {
    const client = buildClient({ currentLevel: 'aal1', nextLevel: 'aal2' });
    createServerClient.mockReturnValue(client);

    const response = await proxy(requestFor('/explore'));

    expect(response.status).toBe(200);
    expect(
      (client.auth.mfa.getAuthenticatorAssuranceLevel as Mock).mock.calls,
    ).toHaveLength(0);
  });
});
