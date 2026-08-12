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
  businessQuery: { is: Mock; limit: Mock; maybeSingle: Mock };
} {
  const profile = buildProfile(role);
  const businessQuery = {
    is: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const fromMock = vi.fn((table: string) => {
    if (table === 'businesses') {
      // Chain: .select('id').eq(owner_id).is('archived_at', null).limit(1)
      //        .maybeSingle() — archived rows are excluded and a second row
      //        can't turn maybeSingle() into an error.
      businessQuery.is.mockReturnValue(businessQuery);
      businessQuery.limit.mockReturnValue(businessQuery);
      businessQuery.maybeSingle.mockResolvedValue({
        data: businessRow,
        error: null,
      });
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => businessQuery) })),
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

  return { client, fromMock, businessQuery };
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
    if (!('user' in res)) throw new Error('expected sign-in success');
    expect(res.user.role).toBe('business_owner');
    expect(res.businessId).toBe('biz-1');
    expect(fromMock).toHaveBeenCalledWith('businesses');
  });

  it('returns businessId null for an owner without a business yet', async () => {
    const { client } = buildClient('business_owner', null);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    if (!('user' in res)) throw new Error('expected sign-in success');
    // redirectByRole sends a null businessId to /business/registration.
    expect(res.businessId).toBeNull();
  });

  it('excludes archived businesses and caps the lookup at one row', async () => {
    // An archived row would route the owner to /business/<archivedId>, whose
    // layout bounces to /business — and a second row would make maybeSingle()
    // error, dropping an existing owner into the registration wizard.
    const { client, businessQuery } = buildClient('business_owner', {
      id: 'biz-1',
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    await signInAction('a@b.com', 'password');

    expect(businessQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(businessQuery.limit).toHaveBeenCalledWith(1);
  });

  it('falls back to a null businessId when the lookup errors', async () => {
    const { client, businessQuery } = buildClient('business_owner', null);
    businessQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'relation "businesses" does not exist' },
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    // Sign-in already succeeded — a lookup failure must not throw, and the
    // driver message must not reach the client.
    if (!('user' in res)) throw new Error('expected sign-in success');
    expect(res.businessId).toBeNull();
    expect(JSON.stringify(res)).not.toContain('relation "businesses"');
  });

  it('skips the businesses lookup entirely for an app_user', async () => {
    const { client, fromMock } = buildClient('app_user', { id: 'never-used' });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);

    const res = await signInAction('a@b.com', 'password');

    if (!('user' in res)) throw new Error('expected sign-in success');
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
