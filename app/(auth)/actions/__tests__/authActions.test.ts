import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import {
  loginAction,
  signupAction,
  verifySessionAction,
} from '@/app/(auth)/actions/authActions';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('authActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loginAction succeeds with valid credentials', async () => {
    const profile = {
      id: 'u1',
      email: 'a@b.com',
      full_name: 'Test',
      status: 'active',
      role: 'app_user',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    const supabaseClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await loginAction('a@b.com', 'password');
    expect(res.user.id).toBe('u1');
    expect(res.user.email).toBe('a@b.com');
  });

  it('loginAction throws on invalid credentials', async () => {
    const supabaseClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid' },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    await expect(loginAction('x@y.com', 'bad')).rejects.toThrow();
  });

  it('signupAction creates account when email not present', async () => {
    const createdProfile = {
      id: 'u2',
      email: 'new@user.com',
      full_name: 'New',
      status: 'active',
      role: 'app_user',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    // Track how many times `from('profiles')` is called: the action now does
    // (1) extras upsert, (2) fetch created profile — the email precheck was
    // removed (dead under RLS; the role comes from signUp metadata via the
    // handle_new_user trigger).
    let fromCall = 0;
    const profilesHandler = () => {
      fromCall += 1;
      // First call: extras upsert -> success
      if (fromCall === 1) {
        return { upsert: () => Promise.resolve({ error: null }) };
      }
      // Second call: fetch created profile
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: createdProfile, error: null }),
          }),
        }),
      };
    };

    const signUp = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
    const supabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profilesHandler();
        return { select: () => ({}) };
      }),
      auth: { signUp },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await signupAction({
      email: 'new@user.com',
      password: 'pass123',
      name: 'New',
      role: 'app_user',
    } as never);
    expect(res.user.id).toBe('u2');
    expect(res.user.email).toBe('new@user.com');
    // The chosen role must travel via signUp metadata — the handle_new_user
    // trigger (not a client-session write) assigns the profile role.
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { full_name: 'New', role: 'app_user' } },
      }),
    );
  });

  it('verifySessionAction returns null when unauthenticated', async () => {
    const supabaseClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await verifySessionAction();
    expect(res).toBeNull();
  });

  it('verifySessionAction returns user when authenticated', async () => {
    const profile = {
      id: 'u3',
      email: 'u3@ex.com',
      full_name: 'U3',
      status: 'active',
      role: 'app_user',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    const supabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u3' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await verifySessionAction();
    expect(res).not.toBeNull();
    expect(res?.user.id).toBe('u3');
  });
});
