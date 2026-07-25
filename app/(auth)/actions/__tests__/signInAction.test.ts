/**
 * signInAction — the unified /sign-in door action.
 *
 * Role-agnostic loginAction core + businessId resolution for business_owner
 * only. Rate limiting is mocked at the helper boundary so these tests don't
 * drain the real in-memory buckets shared with the other auth tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { signInAction } from '@/app/(auth)/actions/authActions';
import { createServerSupabaseClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import type { User } from '@/lib/types/user';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  SUPABASE_COOKIE_PREFIX: 'sb-test',
  SUPABASE_COOKIE_OPTIONS: {},
}));

vi.mock('@/app/api/helpers/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
  clientIp: vi.fn(() => '1.2.3.4'),
}));

function buildProfile(role: User['role']): Record<string, unknown> {
  return {
    id: 'u1',
    email: 'a@b.com',
    full_name: 'Test',
    status: 'active',
    role,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  };
}

/**
 * Minimal client covering the signInAction path: signInWithPassword, the two
 * profiles reads (status check + full profile), and the businesses ownership
 * lookup. `businessRow` controls what maybeSingle returns.
 */
function buildClient(
  role: User['role'],
  businessRow: { id: string } | null,
): {
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  fromMock: Mock;
} {
  const profile = buildProfile(role);
  const fromMock = vi.fn((table: string) => {
    if (table === 'businesses') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: businessRow, error: null }),
          })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: profile, error: null }),
        })),
      })),
    };
  });

  const client = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      }),
    },
    from: fromMock,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

  return { client, fromMock };
}

describe('signInAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (rateLimit as unknown as Mock).mockReturnValue({ allowed: true });
  });

  it('resolves businessId for a business_owner', async () => {
    const { client, fromMock } = buildClient('business_owner', { id: 'biz-1' });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    expect('rateLimited' in res).toBe(false);
    if ('rateLimited' in res) return;
    expect(res.user.role).toBe('business_owner');
    expect(res.businessId).toBe('biz-1');
    expect(fromMock).toHaveBeenCalledWith('businesses');
  });

  it('returns businessId null for an owner without a business yet', async () => {
    const { client } = buildClient('business_owner', null);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    if ('rateLimited' in res) throw new Error('unexpected rate limit');
    // redirectByRole sends a null businessId to /business/registration.
    expect(res.businessId).toBeNull();
  });

  it('skips the businesses lookup entirely for an app_user', async () => {
    const { client, fromMock } = buildClient('app_user', { id: 'never-used' });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    if ('rateLimited' in res) throw new Error('unexpected rate limit');
    expect(res.user.role).toBe('app_user');
    expect(res.businessId).toBeNull();
    expect(fromMock).not.toHaveBeenCalledWith('businesses');
  });

  it('passes the typed rate-limited result through untouched', async () => {
    (rateLimit as unknown as Mock).mockReturnValue({
      allowed: false,
      retryAfterSec: 60,
    });
    const { client } = buildClient('app_user', null);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    expect(res).toMatchObject({ rateLimited: true });
    if (!('rateLimited' in res)) return;
    expect(res.message).toContain('Too many attempts');
    // Rate limiting fires before any auth work.
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
