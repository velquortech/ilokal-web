/**
 * redeemCouponAction / follow actions.
 *
 * The redeem gates live in the `redeem_coupon` RPC (migration 20261024000000),
 * shared with the mobile route; their behaviour is pinned by
 * `supabase/tests/redemption_lockdown.test.sql`. What this file pins is the
 * action's own half: the auth gates that run before the DB, the RPC call, and
 * the mapping of each RPC code to the action's failure shape + user copy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  redeemCouponAction,
  followBusinessAction,
  unfollowBusinessAction,
} from '@/app/customer/actions/customerActions';
import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { User } from '@/lib/types/user';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/api/getCurrentUser', () => ({
  getCurrentUser: vi.fn(),
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';
const COUPON_ID = '22222222-2222-2222-2222-222222222222';
const BRANCH_ID = '33333333-3333-3333-3333-333333333333';
const BUSINESS_ID = '44444444-4444-4444-4444-444444444444';

const customer = {
  id: USER_ID,
  role: 'app_user',
  status: 'active',
  archived_at: null,
} as unknown as User;

const REDEMPTION = {
  id: 'red-1',
  code: 'ABC123',
  expires_at: '2026-12-31T00:00:00.000Z',
  user_id: USER_ID,
  coupon_id: COUPON_ID,
  branch_id: BRANCH_ID,
  is_claimed: false,
  redeemed_at: '2026-10-24T00:00:00.000Z',
};

interface MockConfig {
  /** What `rpc('redeem_coupon')` resolves to. Defaults to a fresh row. */
  redeem?: { data: unknown; error: unknown };
  notifyError?: unknown;
  followInsertError?: { code: string } | null;
}

const followInsert = vi.fn();
const rpcMock = vi.fn();

function mockSupabase(config: MockConfig) {
  const from = vi.fn((table: string) => {
    if (table === 'follows') {
      return {
        insert: followInsert.mockResolvedValue({
          error: config.followInsertError ?? null,
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };
    }
    // Redeem must never touch a table directly — the writes are revoked.
    throw new Error(`unexpected table ${table}`);
  });

  rpcMock.mockImplementation(async (fn: string) => {
    if (fn === 'redeem_coupon') {
      return config.redeem ?? { data: REDEMPTION, error: null };
    }
    if (fn === 'notify_coupon_redemption') {
      return { data: null, error: config.notifyError ?? null };
    }
    return { data: null, error: null };
  });

  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from,
    rpc: rpcMock,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
}

function rpcError(code: string, hint: string) {
  return { data: null, error: { message: code, hint, code: 'P0001' } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(customer);
});

describe('redeemCouponAction — auth gates', () => {
  it('requires a session', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({ ok: false, code: 'AUTH_REQUIRED' });
  });

  it('rejects non-customer roles', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
      role: 'business_owner',
    } as unknown as User);
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });

  it('rejects malformed ids before touching the DB', async () => {
    const result = await redeemCouponAction('nope', BRANCH_ID);
    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('blocks a suspended account even with the customer role', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...customer,
      status: 'suspended',
    } as unknown as User);
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('blocks an archived (soft-deleted) account', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...customer,
      archived_at: '2026-07-01T00:00:00Z',
    } as unknown as User);
    const result = await followBusinessAction(BUSINESS_ID);
    expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });

  it('rate-limits a flood of mutations per user', async () => {
    // Dedicated user id so the shared in-memory bucket never bleeds into the
    // other tests in this file.
    const floodUser = {
      ...customer,
      id: '99999999-9999-9999-9999-999999999999',
    } as unknown as User;
    vi.mocked(getCurrentUser).mockResolvedValue(floodUser);
    mockSupabase({});

    let limited = false;
    for (let i = 0; i < 31; i++) {
      const result = await followBusinessAction(BUSINESS_ID);
      if (!result.ok && result.code === 'RATE_LIMITED') {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});

describe('redeemCouponAction — RPC gate mapping', () => {
  it.each([
    ['COUPON_NOT_FOUND', 'Coupon not found or not yet active', 'BAD_REQUEST'],
    [
      'BRANCH_MISMATCH',
      'This deal cannot be redeemed at that branch',
      'BAD_REQUEST',
    ],
    ['COUPON_EXPIRED', 'Coupon has expired', 'BAD_REQUEST'],
    [
      'COUPON_LIMIT_REACHED',
      'Coupon has reached its redemption limit',
      'BAD_REQUEST',
    ],
    ['FOLLOW_REQUIRED', 'Follow this business to claim this deal', 'FORBIDDEN'],
    [
      'ALREADY_IN_WALLET',
      'You already have this deal in your wallet',
      'BAD_REQUEST',
    ],
    [
      'PER_USER_LIMIT_REACHED',
      'You have already redeemed this coupon the maximum number of times',
      'BAD_REQUEST',
    ],
    ['UNAUTHENTICATED', 'Sign in to continue', 'AUTH_REQUIRED'],
  ])('%s → %s', async (rpcCode, hint, actionCode) => {
    mockSupabase({ redeem: rpcError(rpcCode, hint) });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toEqual({ ok: false, code: actionCode, message: hint });
    expect(rpcMock).not.toHaveBeenCalledWith(
      'notify_coupon_redemption',
      expect.anything(),
    );
  });

  it('an unknown DB error is a generic SERVER_ERROR, never the DB text', async () => {
    mockSupabase({
      redeem: {
        data: null,
        error: { message: 'relation "x" does not exist', code: '42P01' },
      },
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toEqual({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Could not redeem right now',
    });
  });
});

describe('redeemCouponAction — success', () => {
  it('redeems through the RPC, notifies, and returns the server code', async () => {
    mockSupabase({});
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toEqual({
      ok: true,
      redemption: {
        id: 'red-1',
        code: 'ABC123',
        expires_at: REDEMPTION.expires_at,
      },
    });
    expect(rpcMock).toHaveBeenCalledWith('redeem_coupon', {
      p_coupon_id: COUPON_ID,
      p_branch_id: BRANCH_ID,
    });
    expect(rpcMock).toHaveBeenCalledWith('notify_coupon_redemption', {
      p_redemption_id: 'red-1',
    });
    expect(rpcMock).not.toHaveBeenCalledWith(
      'increment_coupon_redemptions',
      expect.anything(),
    );
  });

  it('a notification failure does not fail the redeem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({ notifyError: { message: 'notify boom' } });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({ ok: true });
  });
});

describe('follow actions', () => {
  it('follow inserts the self-scoped row', async () => {
    mockSupabase({});
    const result = await followBusinessAction(BUSINESS_ID);
    expect(result).toEqual({ ok: true });
    expect(followInsert).toHaveBeenCalledWith({
      user_id: USER_ID,
      business_id: BUSINESS_ID,
    });
  });

  it('duplicate follow (23505) is treated as success', async () => {
    mockSupabase({ followInsertError: { code: '23505' } });
    const result = await followBusinessAction(BUSINESS_ID);
    expect(result).toEqual({ ok: true });
  });

  it('unfollow requires a session', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const result = await unfollowBusinessAction(BUSINESS_ID);
    expect(result).toMatchObject({ ok: false, code: 'AUTH_REQUIRED' });
  });

  it('rejects a non-uuid business id', async () => {
    const result = await followBusinessAction('DROP TABLE follows');
    expect(result).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
  });
});
