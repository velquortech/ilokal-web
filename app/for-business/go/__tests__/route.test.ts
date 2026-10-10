/**
 * GET /for-business/go — the tracked entry into /for-business.
 *
 * Contract: every request ends on /for-business (tracking never blocks the
 * visitor); a valid `ref` is recorded once per tap and remembered in a cookie
 * so `signupAction` can attribute the account; an invalid one is ignored.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from '@/app/for-business/go/route';
import { createServerSupabaseClient } from '@/supabase/server';
import { SIGNUP_REF_COOKIE, VISITOR_COOKIE } from '@/lib/utils/signupRef';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

const VISITOR = '3f1d2c4b-5a69-4e7f-8a1b-2c3d4e5f6a7b';

function mockRpc(result: { error: unknown } = { error: null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({ rpc });
  return rpc;
}

function request(query: string, cookie?: string, ip = '203.0.113.7') {
  return new NextRequest(`https://ilokal.shop/for-business/go${query}`, {
    headers: {
      'x-forwarded-for': ip,
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe('GET /for-business/go', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records the tap, remembers the ref, and lands on /for-business', async () => {
    const rpc = mockRpc();

    const res = await GET(request('?ref=app_profile'));

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get('location')!).pathname).toBe(
      '/for-business',
    );
    expect(res.cookies.get(SIGNUP_REF_COOKIE)?.value).toBe('app_profile');
    const visitor = res.cookies.get(VISITOR_COOKIE)?.value;
    expect(visitor).toMatch(/^[0-9a-f-]{36}$/);
    expect(rpc).toHaveBeenCalledWith('record_registration_landing', {
      p_ref: 'app_profile',
      p_visitor: visitor,
    });
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps a returning visitor id so repeat taps count as one visitor', async () => {
    const rpc = mockRpc();

    await GET(
      request('?ref=app_guest', `${VISITOR_COOKIE}=${VISITOR}`, '203.0.113.8'),
    );

    expect(rpc).toHaveBeenCalledWith('record_registration_landing', {
      p_ref: 'app_guest',
      p_visitor: VISITOR,
    });
  });

  it('ignores an invalid ref: no record, no cookie, same destination', async () => {
    const rpc = mockRpc();

    const res = await GET(request('?ref=Bad-Ref', undefined, '203.0.113.9'));

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get('location')!).pathname).toBe(
      '/for-business',
    );
    expect(res.cookies.get(SIGNUP_REF_COOKIE)).toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('still forwards (and still remembers the ref) when recording fails', async () => {
    mockRpc({ error: { message: 'db down' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(
      request('?ref=app_profile', undefined, '203.0.113.10'),
    );

    expect(res.status).toBe(303);
    expect(res.cookies.get(SIGNUP_REF_COOKIE)?.value).toBe('app_profile');
  });

  it('stops recording a flood from one address but never blocks the visitor', async () => {
    const rpc = mockRpc();
    const ip = '198.51.100.1';

    for (let i = 0; i < 40; i++) {
      const res = await GET(request('?ref=app_profile', undefined, ip));
      expect(res.status).toBe(303);
    }

    expect(rpc.mock.calls.length).toBeLessThan(40);
  });
});
