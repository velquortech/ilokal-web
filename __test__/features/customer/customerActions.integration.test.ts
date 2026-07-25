/**
 * redeemCouponAction / follow actions — full gate matrix.
 *
 * The web redeem action must stay behavior-identical to the mobile route
 * (`app/api/protected/mobile/redemptions/route.ts`): same gate ORDER and the
 * exact user copy from `.claude/docs/coupon-rules.md`. These tests pin that
 * contract so either twin drifting fails the build.
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

function futureIso(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

interface CouponRow {
  id: string;
  start_date: string;
  expiry_date: string;
  status: string;
  max_redemptions_per_user: number | null;
  max_redemptions_global: number | null;
  current_redemptions: number;
  requires_follow: boolean;
  business_id: string;
  branch_id: string | null;
}

function liveCoupon(overrides: Partial<CouponRow> = {}): CouponRow {
  return {
    id: COUPON_ID,
    start_date: futureIso(-24),
    expiry_date: futureIso(24),
    status: 'published',
    max_redemptions_per_user: null,
    max_redemptions_global: null,
    current_redemptions: 0,
    requires_follow: false,
    business_id: BUSINESS_ID,
    branch_id: null,
    ...overrides,
  };
}

/**
 * Table-routed supabase mock. Each table gets a self-chaining proxy whose
 * terminal methods resolve with the configured result.
 */
interface TableConfig {
  coupon?: { data: CouponRow | null; error?: unknown };
  /** Defaults to a branch belonging to the coupon's business. */
  branch?: { id: string; business_id: string } | null;
  followCount?: number;
  priorRedemptions?: Array<{ is_claimed: boolean; expires_at: string | null }>;
  insertResult?: {
    data: { id: string; code: string | null; expires_at: string | null } | null;
    error?: unknown;
  };
  followInsertError?: { code: string } | null;
  increment?: boolean;
}

const deleteEq = vi.fn();
const followInsert = vi.fn();
const rpcMock = vi.fn();

function mockSupabase(config: TableConfig) {
  const from = vi.fn((table: string) => {
    if (table === 'coupons') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: config.coupon?.data ?? null,
          error: config.coupon?.error ?? (config.coupon?.data ? null : {}),
        }),
      };
    }
    if (table === 'branches') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data:
            config.branch === undefined
              ? { id: BRANCH_ID, business_id: BUSINESS_ID }
              : config.branch,
          error: null,
        }),
      };
    }
    if (table === 'follows') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              count: config.followCount ?? 0,
              error: null,
            }),
          })),
        })),
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
    if (table === 'user_redemptions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: config.priorRedemptions ?? [],
              error: null,
            }),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(
              config.insertResult ?? {
                data: {
                  id: 'red-1',
                  code: 'ABC123',
                  expires_at: futureIso(24),
                },
                error: null,
              },
            ),
          })),
        })),
        delete: vi.fn(() => ({ eq: deleteEq.mockResolvedValue({}) })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  rpcMock.mockImplementation(async (fn: string) => {
    if (fn === 'increment_coupon_redemptions') {
      return { data: config.increment ?? true, error: null };
    }
    return { data: null, error: null };
  });

  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from,
    rpc: rpcMock,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
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

describe('redeemCouponAction — coupon gates (mobile-route copy)', () => {
  it('unknown/unpublished coupon', async () => {
    mockSupabase({ coupon: { data: null } });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'Coupon not found or not yet active',
    });
  });

  it('rejects a branch belonging to a different business', async () => {
    mockSupabase({
      coupon: { data: liveCoupon() },
      branch: { id: BRANCH_ID, business_id: 'not-the-coupon-business' },
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'This deal cannot be redeemed at that branch',
    });
  });

  it('rejects redeeming a branch-scoped coupon at another branch', async () => {
    mockSupabase({
      coupon: {
        data: liveCoupon({
          branch_id: '55555555-5555-5555-5555-555555555555',
        }),
      },
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'This deal cannot be redeemed at that branch',
    });
  });

  it('expired coupon', async () => {
    mockSupabase({
      coupon: { data: liveCoupon({ expiry_date: futureIso(-1) }) },
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({ ok: false, message: 'Coupon has expired' });
  });

  it('global cap already reached', async () => {
    mockSupabase({
      coupon: {
        data: liveCoupon({
          max_redemptions_global: 50,
          current_redemptions: 50,
        }),
      },
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'Coupon has reached its redemption limit',
    });
  });

  it('follow gate returns FORBIDDEN with the follow copy', async () => {
    mockSupabase({
      coupon: { data: liveCoupon({ requires_follow: true }) },
      followCount: 0,
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Follow this business to claim this deal',
    });
  });

  it('active duplicate in the wallet', async () => {
    mockSupabase({
      coupon: { data: liveCoupon() },
      priorRedemptions: [{ is_claimed: false, expires_at: futureIso(5) }],
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'You already have this deal in your wallet',
    });
  });

  it('per-user lifetime cap', async () => {
    mockSupabase({
      coupon: { data: liveCoupon({ max_redemptions_per_user: 1 }) },
      priorRedemptions: [{ is_claimed: true, expires_at: null }],
    });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message:
        'You have already redeemed this coupon the maximum number of times',
    });
  });
});

describe('redeemCouponAction — success + race', () => {
  it('inserts, increments, and returns the server-generated code', async () => {
    mockSupabase({ coupon: { data: liveCoupon() } });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: true,
      redemption: { id: 'red-1', code: 'ABC123' },
    });
    expect(rpcMock).toHaveBeenCalledWith('increment_coupon_redemptions', {
      p_coupon_id: COUPON_ID,
    });
    expect(rpcMock).toHaveBeenCalledWith('notify_coupon_redemption', {
      p_redemption_id: 'red-1',
    });
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it('rolls the row back when a concurrent redeem takes the last slot', async () => {
    mockSupabase({ coupon: { data: liveCoupon() }, increment: false });
    const result = await redeemCouponAction(COUPON_ID, BRANCH_ID);
    expect(result).toMatchObject({
      ok: false,
      message: 'Coupon has reached its redemption limit',
    });
    expect(deleteEq).toHaveBeenCalledWith('id', 'red-1');
  });

  it('a follower passes the follow gate', async () => {
    mockSupabase({
      coupon: { data: liveCoupon({ requires_follow: true }) },
      followCount: 1,
    });
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
