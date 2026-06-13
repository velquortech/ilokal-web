import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import type { MFAFactor } from '@/lib/types';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { listMFAFactorsAction, unenrollMFAAction } from '../mfaActions';

const BID = 'biz-00000000-0000-0000-0000-000000000001';
const UID = 'user-0000-0000-0000-000000000001';
const FACTOR_ID = 'factor-1111-1111-1111-000000000001';

const authorized = {
  authorized: true as const,
  user: { id: UID },
  business: { id: BID },
};
const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

const rawFactor = {
  id: FACTOR_ID,
  friendly_name: 'My Authenticator',
  factor_type: 'totp',
  status: 'verified',
  created_at: '2026-06-05T00:00:00.000Z',
  updated_at: '2026-06-05T00:00:00.000Z',
};

const expectedFactor: MFAFactor = {
  id: FACTOR_ID,
  friendly_name: 'My Authenticator',
  factor_type: 'totp',
  status: 'verified',
  created_at: '2026-06-05T00:00:00.000Z',
  updated_at: '2026-06-05T00:00:00.000Z',
};

function makeClientWithMFA(
  overrides: { listFactors?: unknown; unenroll?: unknown } = {},
) {
  return {
    auth: {
      mfa: {
        listFactors: vi.fn().mockResolvedValue(
          overrides.listFactors ?? {
            data: { totp: [rawFactor] },
            error: null,
          },
        ),
        unenroll: vi
          .fn()
          .mockResolvedValue(overrides.unenroll ?? { error: null }),
      },
    },
  };
}

beforeEach(() => vi.clearAllMocks());

// ── listMFAFactorsAction ──────────────────────────────────────────────────────

describe('listMFAFactorsAction', () => {
  it('returns error when not authorized', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(unauthorized);
    const result = await listMFAFactorsAction(BID);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns empty array when no factors enrolled', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeClientWithMFA({ listFactors: { data: { totp: [] }, error: null } }),
    );
    const result = await listMFAFactorsAction(BID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns mapped factors when enrolled', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeClientWithMFA(),
    );
    const result = await listMFAFactorsAction(BID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([expectedFactor]);
  });

  it('returns MFA_ERROR on Supabase error', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeClientWithMFA({
        listFactors: { data: null, error: { message: 'MFA unavailable' } },
      }),
    );
    const result = await listMFAFactorsAction(BID);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MFA_ERROR');
  });
});

// ── unenrollMFAAction ─────────────────────────────────────────────────────────

describe('unenrollMFAAction', () => {
  it('returns error when not authorized', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(unauthorized);
    const result = await unenrollMFAAction(BID, FACTOR_ID);
    expect(result.success).toBe(false);
  });

  it('returns VALIDATION_ERROR when factorId is empty', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await unenrollMFAAction(BID, '');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('calls supabase.auth.mfa.unenroll with correct factorId', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const client = makeClientWithMFA();
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      client,
    );
    const result = await unenrollMFAAction(BID, FACTOR_ID);
    expect(result.success).toBe(true);
    expect(client.auth.mfa.unenroll).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
    });
  });

  it('returns MFA_ERROR when Supabase unenroll fails', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeClientWithMFA({
        unenroll: { error: { message: 'Factor not found' } },
      }),
    );
    const result = await unenrollMFAAction(BID, FACTOR_ID);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MFA_ERROR');
    expect(result.error?.message).toBe('Factor not found');
  });
});
