/**
 * signupAction — carries the /for-business/go ref onto the new account.
 *
 * The ref rides in user metadata because that is what survives the email
 * confirmation hop (often opened in a different browser): the shop-insert
 * trigger later reads it from auth.users, not from any cookie.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { signupAction } from '@/app/(auth)/actions/authActions';
import { createServerSupabaseClient } from '@/supabase/server';
import { cookies } from 'next/headers';
import { SIGNUP_REF_COOKIE } from '@/lib/utils/signupRef';

vi.mock('@/supabase/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/supabase/server')>();
  return { ...actual, createServerSupabaseClient: vi.fn() };
});
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));

const INPUT = {
  email: 'owner@example.com',
  password: 'SecurePass123!',
  name: 'Owner',
  role: 'business_owner',
} as Parameters<typeof signupAction>[0];

function mockSupabase() {
  const signUp = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  const single = vi.fn().mockResolvedValue({ data: { id: 'u1' } });
  const client = {
    auth: { signUp },
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: () => ({ eq: () => ({ single }) }),
    }),
  };
  (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);
  return signUp;
}

function mockCookies(values: Record<string, string>) {
  (cookies as unknown as Mock).mockResolvedValue({
    get: (name: string) =>
      name in values ? { name, value: values[name] } : undefined,
  });
}

describe('signupAction — signup attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores the remembered ref in the new account’s metadata', async () => {
    const signUp = mockSupabase();
    mockCookies({ [SIGNUP_REF_COOKIE]: 'app_profile' });

    await signupAction(INPUT);

    expect(signUp.mock.calls[0][0].options.data).toEqual({
      full_name: 'Owner',
      role: 'business_owner',
      signup_ref: 'app_profile',
    });
  });

  it('adds nothing when the visitor never came through a tracked link', async () => {
    const signUp = mockSupabase();
    mockCookies({});

    await signupAction(INPUT);

    expect(signUp.mock.calls[0][0].options.data).not.toHaveProperty(
      'signup_ref',
    );
  });

  it('drops a tampered cookie instead of writing it to the account', async () => {
    const signUp = mockSupabase();
    mockCookies({ [SIGNUP_REF_COOKIE]: "app'; drop table--" });

    await signupAction(INPUT);

    expect(signUp.mock.calls[0][0].options.data).not.toHaveProperty(
      'signup_ref',
    );
  });
});
