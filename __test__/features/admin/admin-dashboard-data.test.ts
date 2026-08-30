/**
 * The admin dashboard's data layer.
 *
 * The page these back used to hardcode every number it displayed, so the risk
 * now is the opposite one: a query that looks plausible and is quietly wrong.
 *
 * The month bucketing itself moved into `analytics_platform_growth` after
 * review — twelve head-only counts per render were correct but were twelve
 * sequential scans, each re-evaluating `is_admin()` per row under RLS. What is
 * left to pin here is the contract around that RPC (admin proven before the
 * RLS-bypassing client, clamped window, outage reported not swallowed) and the
 * scoping of the stat-card counts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type CountCall = {
  table: string;
  head: boolean;
  gte?: string;
  eq: [string, string][];
  is: [string, unknown][];
};

const calls: CountCall[] = [];
let failTables = new Set<string>();
let rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
let rpcResult: { data: unknown; error: unknown } = { data: [], error: null };
let authorized = true;

function makeSupabase() {
  return {
    from: (table: string) => {
      const call: CountCall = { table, head: false, eq: [], is: [] };
      const builder = {
        select: (_cols: string, opts?: { head?: boolean }) => {
          call.head = opts?.head === true;
          calls.push(call);
          return builder;
        },
        gte: (_c: string, v: string) => {
          call.gte = v;
          return builder;
        },
        eq: (c: string, v: string) => {
          call.eq.push([c, v]);
          return builder;
        },
        is: (c: string, v: unknown) => {
          call.is.push([c, v]);
          return builder;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve(
            failTables.has(table)
              ? { count: null, error: { message: 'boom' } }
              : { count: 7, error: null },
          ),
      };
      return builder;
    },
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResult);
    },
  };
}

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAnalytics: vi.fn(),
  assertAuthorized: vi.fn(),
}));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: mocks.createClient,
  createAnalyticsSupabaseClient: mocks.createAnalytics,
}));
vi.mock('@/lib/utils/auth', () => ({
  assertAuthorized: mocks.assertAuthorized,
}));

beforeEach(() => {
  calls.length = 0;
  rpcCalls = [];
  failTables = new Set();
  authorized = true;
  rpcResult = { data: [], error: null };
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(makeSupabase());
  mocks.createAnalytics.mockResolvedValue(makeSupabase());
  mocks.assertAuthorized.mockImplementation(async () => ({
    authorized,
    error: authorized ? undefined : { code: 'FORBIDDEN', message: 'no' },
  }));
});

const load = () => import('@/lib/api/admin/analyticsQuery');

describe('growth: admin is proved before the RLS-bypassing call', () => {
  it('checks the admin role, and does so first', async () => {
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth();

    expect(mocks.assertAuthorized).toHaveBeenCalledWith(undefined, {
      roles: ['admin'],
    });
  });

  it('never reaches the service-role client for a non-admin', async () => {
    // The RPC is SECURITY DEFINER and reads every profile on the platform, so
    // the check has to happen BEFORE the client is built, not after.
    authorized = false;
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth();

    expect(mocks.createAnalytics).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
    expect(result).toEqual({ buckets: [], failed: true });
  });
});

describe('growth: one aggregate, not a fan-out', () => {
  it('calls the RPC once and issues no per-month counts', async () => {
    // The previous version made 12 PostgREST requests per render. The
    // aggregation belongs in SQL.
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth(6);

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('analytics_platform_growth');
    expect(calls).toHaveLength(0);
  });

  it('clamps the window so the month-only axis label cannot repeat', async () => {
    const { getPlatformGrowth, MAX_GROWTH_MONTHS } = await load();
    await getPlatformGrowth(60);

    expect(rpcCalls[0].args.p_months).toBe(MAX_GROWTH_MONTHS);
  });

  it('refuses a nonsensical window rather than passing it through', async () => {
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth(0);
    await getPlatformGrowth(-3);

    expect(rpcCalls.every((c) => (c.args.p_months as number) >= 1)).toBe(true);
  });
});

describe('growth: labels', () => {
  it('reads the month from the date string, not through new Date()', async () => {
    // A bare `YYYY-MM-DD` parsed by `new Date()` is UTC midnight, which slips
    // a month backwards for anyone west of Greenwich.
    rpcResult = {
      data: [
        { month_start: '2026-08-01', users: 42, businesses: 12 },
        { month_start: '2026-09-01', users: 3, businesses: 1 },
      ],
      error: null,
    };
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth();

    expect(result.buckets.map((b) => b.month)).toEqual(['Aug', 'Sep']);
    expect(result.buckets[0].users).toBe(42);
  });

  it('adds the year once the window crosses one', async () => {
    // Two "Jan" ticks on the same axis is unreadable.
    rpcResult = {
      data: [
        { month_start: '2026-12-01', users: 1, businesses: 0 },
        { month_start: '2027-01-01', users: 2, businesses: 0 },
      ],
      error: null,
    };
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth();

    expect(result.buckets.map((b) => b.month)).toEqual(['Dec 26', 'Jan 27']);
  });
});

describe('an outage is not a zero', () => {
  it('reports a failed RPC instead of an empty chart', async () => {
    rpcResult = { data: null, error: { message: 'boom' } };
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth();

    expect(result).toEqual({ buckets: [], failed: true });
  });

  it('survives a thrown client', async () => {
    // `createAnalyticsSupabaseClient` throws on missing env; a 500 here would
    // take down a dashboard whose whole point is degrading to an em dash.
    mocks.createAnalytics.mockRejectedValue(new Error('no env'));
    const { getPlatformGrowth } = await load();

    await expect(getPlatformGrowth()).resolves.toEqual({
      buckets: [],
      failed: true,
    });
  });

  it('nulls only the figure that failed, not the whole card set', async () => {
    // One bad read must not blank a total that loaded fine.
    failTables = new Set(['businesses']);
    const { getAdminDashboardSummary } = await load();
    const result = await getAdminDashboardSummary();

    expect(result.total_users).toBe(7);
    expect(result.new_users_last_30_days).toBe(7);
    expect(result.total_businesses).toBeNull();
    expect(result.verified_businesses).toBeNull();
    expect(result.failed).toBe(true);
  });

  it('reports no failure when every read lands', async () => {
    const { getAdminDashboardSummary } = await load();
    const result = await getAdminDashboardSummary();

    expect(result.failed).toBe(false);
    expect(result.total_users).toBe(7);
  });
});

describe('the summary counts the right rows', () => {
  it('is head-only throughout', async () => {
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    expect(calls).toHaveLength(5);
    expect(calls.every((c) => c.head)).toBe(true);
  });

  it('excludes archived rows from EVERY count', async () => {
    // Two cards in one row disagreed because the totals counted soft-deleted
    // rows while verified/pending filtered them. A soft-deleted account
    // (mobile DELETE /me) is not a user anyone should be counting.
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    expect(calls).toHaveLength(5);
    for (const call of calls) {
      expect(call.is).toContainEqual(['archived_at', null]);
    }
  });

  it('scopes the status counts as well as archiving them', async () => {
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    const statuses = calls.flatMap((c) => c.eq.map(([, v]) => v));
    expect(statuses).toContain('verified');
    expect(statuses).toContain('pending');
  });

  it('does not read payments', async () => {
    // There is no billing surface in this app — the billing routes were
    // deleted as dead in the 2026-07-17 audit and `payments` is empty. A "₱0"
    // revenue card would advertise a feature that does not exist.
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    expect(calls.some((c) => c.table === 'payments')).toBe(false);
  });
});
