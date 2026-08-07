/**
 * The admin dashboard's data layer (`.claude/ADMIN_ANALYTICS.md`, AD4/AD6/AD7).
 *
 * The page these back used to hardcode every number it displayed, so the risk
 * now is the opposite one: a query that looks plausible and is quietly wrong.
 * The three ways that happens here are a month boundary read in the server's
 * zone instead of Manila, a fetch-then-group that truncates at the PostgREST
 * row cap, and an outage rendering as a confident zero.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type CountCall = {
  table: string;
  head: boolean;
  gte?: string;
  lt?: string;
  eq: [string, string][];
  is: [string, unknown][];
};

const calls: CountCall[] = [];
let failTables = new Set<string>();

function makeSupabase() {
  return {
    from: (table: string) => {
      const call: CountCall = { table, head: false, eq: [], is: [] };
      const builder = {
        select: (_cols: string, opts?: { head?: boolean; count?: string }) => {
          call.head = opts?.head === true;
          calls.push(call);
          return builder;
        },
        gte: (_col: string, value: string) => {
          call.gte = value;
          return builder;
        },
        lt: (_col: string, value: string) => {
          call.lt = value;
          return builder;
        },
        eq: (col: string, value: string) => {
          call.eq.push([col, value]);
          return builder;
        },
        is: (col: string, value: unknown) => {
          call.is.push([col, value]);
          return builder;
        },
        // Awaiting the builder resolves it, which is how PostgREST clients work.
        then: (resolve: (value: unknown) => void) =>
          resolve(
            failTables.has(table)
              ? { count: null, error: { message: 'boom' } }
              : { count: 7, error: null },
          ),
      };
      return builder;
    },
  };
}

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: mocks.createClient,
}));

beforeEach(() => {
  calls.length = 0;
  failTables = new Set();
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(makeSupabase());
});

const load = () => import('@/lib/api/admin/analyticsQuery');

describe('AD7 — month buckets are pinned to Manila', () => {
  it('starts each bucket at midnight Manila, not midnight UTC', async () => {
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth(1, new Date('2026-08-15T00:00:00Z'));

    const bucket = calls.find((c) => c.table === 'profiles');
    // Midnight on 1 Aug in Manila is 16:00 on 31 Jul UTC. A boundary built in
    // the server's zone would say 2026-08-01T00:00:00Z and file eight hours of
    // signups into the wrong month.
    expect(bucket?.gte).toBe('2026-07-31T16:00:00.000Z');
    expect(bucket?.lt).toBe('2026-08-31T16:00:00.000Z');
  });

  it('uses Manila’s calendar month when UTC is still on the previous day', async () => {
    // 2026-08-31T23:00Z is already 1 September in Manila, so the newest bucket
    // must be September — reading the server's clock would give August.
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth(1, new Date('2026-08-31T23:00:00Z'));

    expect(result.buckets.at(-1)?.month).toBe('Sep');
  });

  it('returns the requested number of buckets, oldest first', async () => {
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth(6, new Date('2026-08-15T00:00:00Z'));

    expect(result.buckets.map((b) => b.month)).toEqual([
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
    ]);
  });

  it('crosses a year boundary without repeating a month', async () => {
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth(3, new Date('2027-01-15T00:00:00Z'));

    expect(result.buckets.map((b) => b.month)).toEqual(['Nov', 'Dec', 'Jan']);
  });
});

describe('AD6 — counts, never fetched rows', () => {
  it('asks for head-only counts on every bucket read', async () => {
    // `select('created_at')` then grouping in Node silently truncates at the
    // PostgREST 1000-row cap. A head-only count carries no rows and stays
    // exact — which is also why this needs no migration.
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth(6, new Date('2026-08-15T00:00:00Z'));

    expect(calls).toHaveLength(12);
    expect(calls.every((c) => c.head)).toBe(true);
  });

  it('reads both entities per bucket', async () => {
    const { getPlatformGrowth } = await load();
    await getPlatformGrowth(3, new Date('2026-08-15T00:00:00Z'));

    expect(calls.filter((c) => c.table === 'profiles')).toHaveLength(3);
    expect(calls.filter((c) => c.table === 'businesses')).toHaveLength(3);
  });
});

describe('AD4 — an outage is not a zero', () => {
  it('flags a failed growth read instead of reporting empty months', async () => {
    failTables = new Set(['businesses']);
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth(2, new Date('2026-08-15T00:00:00Z'));

    expect(result.failed).toBe(true);
  });

  it('reports success when every read lands', async () => {
    const { getPlatformGrowth } = await load();
    const result = await getPlatformGrowth(2, new Date('2026-08-15T00:00:00Z'));

    expect(result.failed).toBe(false);
    expect(result.buckets.every((b) => b.users === 7)).toBe(true);
  });

  it('flags a failed summary read', async () => {
    failTables = new Set(['profiles']);
    const { getAdminDashboardSummary } = await load();
    const result = await getAdminDashboardSummary();

    expect(result.failed).toBe(true);
  });
});

describe('the summary counts the right rows', () => {
  it('is head-only throughout', async () => {
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    expect(calls.every((c) => c.head)).toBe(true);
  });

  it('scopes verified and pending to live shops', async () => {
    // `archived_at IS NULL` matters on both: a soft-deleted shop is neither
    // live nor waiting for anyone.
    const { getAdminDashboardSummary } = await load();
    await getAdminDashboardSummary();

    const business = calls.filter((c) => c.table === 'businesses');
    const verified = business.find((c) =>
      c.eq.some(([, v]) => v === 'verified'),
    );
    const pending = business.find((c) => c.eq.some(([, v]) => v === 'pending'));

    expect(verified?.is).toContainEqual(['archived_at', null]);
    expect(pending?.is).toContainEqual(['archived_at', null]);
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
