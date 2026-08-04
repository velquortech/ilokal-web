/**
 * Event stat counts.
 *
 * Two claims. First that these are COUNT-ONLY reads — `head: true`, no row
 * payload — because the alternative every dashboard in this repo started with
 * was `select('status')` then `.filter().length`, which the PostgREST 1000-row
 * cap turns into a wrong number the moment a shop gets busy.
 *
 * Second that a failed read says so. Four confident zeros and "we couldn't
 * read this" look identical on a stat card, and that has already shipped once.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { getEventStats } from '../eventQuery';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn((_c: unknown, _b: string, p: string | null) => p),
}));

type CountResult = { count: number | null; error: { message: string } | null };

interface RecordedQuery {
  select: unknown[][];
  eq: unknown[][];
  is: unknown[][];
}

/**
 * One fresh chain per `from()`, so each count's filters can be inspected on
 * its own — the queries differ only in the last `.eq()`/`.is()`.
 */
function mockCounts(results: CountResult[]) {
  const queries: RecordedQuery[] = [];

  const from = vi.fn(() => {
    const recorded: RecordedQuery = { select: [], eq: [], is: [] };
    queries.push(recorded);

    const result = results[queries.length - 1] ?? { count: 0, error: null };

    const proxy: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        recorded.select.push(args);
        return proxy;
      },
      eq: (...args: unknown[]) => {
        recorded.eq.push(args);
        return proxy;
      },
      is: (...args: unknown[]) => {
        recorded.is.push(args);
        return proxy;
      },
      then: (resolve: (value: CountResult) => unknown) => resolve(result),
    };

    return proxy;
  });

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { from, queries };
}

const ok = (count: number): CountResult => ({ count, error: null });
const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => vi.clearAllMocks());

describe('getEventStats', () => {
  it('counts one status per query and totals the four', async () => {
    mockCounts([ok(1), ok(2), ok(3), ok(4)]);

    const stats = await getEventStats(BUSINESS_ID);

    expect(stats).toMatchObject({
      draft: 1,
      pending_review: 2,
      approved: 3,
      rejected: 4,
      total: 10,
      failed: false,
    });
  });

  it('asks for a count and no rows', async () => {
    const { queries } = mockCounts([ok(0), ok(0), ok(0), ok(0)]);

    await getEventStats(BUSINESS_ID);

    for (const query of queries) {
      expect(query.select[0]).toEqual(['id', { count: 'exact', head: true }]);
    }
  });

  it('scopes every count to the shop and to live rows', async () => {
    const { queries } = mockCounts([ok(0), ok(0), ok(0), ok(0)]);

    await getEventStats(BUSINESS_ID);

    for (const query of queries) {
      expect(query.is).toContainEqual(['archived_at', null]);
      expect(query.eq).toContainEqual(['business_id', BUSINESS_ID]);
    }
  });

  it('never asks a shop for its staff-pick count', async () => {
    // A platform event has no business_id, so inside a shop's scope the answer
    // is always 0 — spending a round trip to learn that is waste.
    const { from } = mockCounts([ok(0), ok(0), ok(0), ok(0)]);

    const stats = await getEventStats(BUSINESS_ID);

    expect(from).toHaveBeenCalledTimes(4);
    expect(stats.staff_picks).toBe(0);
  });

  it('counts staff picks for the admin view', async () => {
    const { from, queries } = mockCounts([ok(0), ok(1), ok(2), ok(0), ok(7)]);

    const stats = await getEventStats();

    expect(from).toHaveBeenCalledTimes(5);
    expect(stats.staff_picks).toBe(7);
    // Unscoped: no business filter on any of them.
    for (const query of queries) {
      expect(query.eq).not.toContainEqual(
        expect.arrayContaining(['business_id']),
      );
    }
  });

  it('reports a failure instead of four confident zeros', async () => {
    mockCounts([ok(3), { count: null, error: { message: 'boom' } }]);

    const stats = await getEventStats(BUSINESS_ID);

    expect(stats.failed).toBe(true);
    expect(stats.total).toBe(0);
  });

  it('does not throw when the client itself blows up', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValue(
      new Error('no connection'),
    );

    // A dashboard panel must not take the page down.
    await expect(getEventStats(BUSINESS_ID)).resolves.toMatchObject({
      failed: true,
    });
  });
});
