/**
 * Regression guard: every business Server Action must scope itself to the shop
 * in the route, not to whichever shop the database happens to return first.
 *
 * `verifyBusinessOwner()` called with NO argument falls back to
 *
 *   .eq('owner_id', user.id).is('archived_at', null).limit(1).maybeSingle()
 *
 * — no ORDER BY, no relation to the URL. An owner holding more than one shop
 * therefore saw another shop's branches, coupons and catalogue rendered under
 * the name of the shop they had actually opened. It was found by the live E2E
 * suite, not by a unit test, because every unit test mocked the helper and so
 * could never notice which argument it received.
 *
 * These tests are deliberately about the ARGUMENT, not the return value. They
 * fail the moment an action drops the id again.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => ({
              range: async () => ({ data: [], count: 0, error: null }),
            }),
          }),
        }),
      }),
    }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  })),
}));

const ROUTE_BUSINESS = 'aaaaaaaa-1111-1111-1111-111111111111';
/** What the buggy `.limit(1)` fallback used to resolve to — a DIFFERENT shop. */
const OTHER_SHOP = 'bbbbbbbb-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    authorized: true,
    user: { id: 'user-1' },
    business: { id: ROUTE_BUSINESS },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
});

/**
 * Each entry: the action, and a call of it with `ROUTE_BUSINESS` first.
 * Kept as thunks so one broken action cannot stop the others from running.
 */
async function callActions(): Promise<Array<[string, () => Promise<unknown>]>> {
  const branch = await import('../branchActions');
  const coupon = await import('../couponActions');
  const product = await import('../productActions');

  return [
    [
      'getBusinessBranchesAction',
      () => branch.getBusinessBranchesAction(ROUTE_BUSINESS, {}),
    ],
    [
      'getBusinessBranchStatsAction',
      () => branch.getBusinessBranchStatsAction(ROUTE_BUSINESS),
    ],
    [
      'getBusinessCouponsPaginatedAction',
      () => coupon.getBusinessCouponsPaginatedAction(ROUTE_BUSINESS, {}),
    ],
    [
      'getBusinessCouponStatsAction',
      () => coupon.getBusinessCouponStatsAction(ROUTE_BUSINESS),
    ],
    [
      'getRedeemedCouponsAction',
      () => coupon.getRedeemedCouponsAction(ROUTE_BUSINESS, {}),
    ],
    [
      'getRedemptionSummaryStatsAction',
      () => coupon.getRedemptionSummaryStatsAction(ROUTE_BUSINESS),
    ],
    [
      'getBusinessProductsAction',
      () => product.getBusinessProductsAction(ROUTE_BUSINESS),
    ],
    [
      'getBusinessProductStatsAction',
      () => product.getBusinessProductStatsAction(ROUTE_BUSINESS),
    ],
  ];
}

describe('business actions scope to the route’s shop', () => {
  it('passes the route businessId to verifyBusinessOwner, never nothing', async () => {
    for (const [name, run] of await callActions()) {
      vi.mocked(verifyBusinessOwner).mockClear();
      await run().catch(() => {
        /* the data layer is stubbed; only the guard call matters here */
      });

      const calls = vi.mocked(verifyBusinessOwner).mock.calls;
      expect(
        calls.length,
        `${name} never called verifyBusinessOwner`,
      ).toBeGreaterThan(0);

      // The bug was calling it with NO argument. `undefined` is the failure.
      expect(calls[0]![0], `${name} did not scope to the route's shop`).toBe(
        ROUTE_BUSINESS,
      );
    }
  });

  it('does not fall back to a different shop than the one asked for', async () => {
    // Simulate the old fallback: the helper resolving some other shop. A
    // correctly-scoped action asks about ROUTE_BUSINESS regardless of what
    // comes back, so the ARGUMENT must still be the route's id.
    vi.mocked(verifyBusinessOwner).mockResolvedValue({
      authorized: true,
      user: { id: 'user-1' },
      business: { id: OTHER_SHOP },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    const [, run] = (await callActions())[0]!;
    await run().catch(() => {});

    expect(vi.mocked(verifyBusinessOwner).mock.calls[0]![0]).toBe(
      ROUTE_BUSINESS,
    );
  });
});

describe('no action re-introduces the argument-less guard', () => {
  it('has zero `verifyBusinessOwner()` calls in the business action files', async () => {
    const { readFileSync, readdirSync } = await import('fs');
    const { join } = await import('path');

    const dir = join(process.cwd(), 'app/business/[businessId]/actions');
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) =>
        readFileSync(join(dir, f), 'utf8').includes('verifyBusinessOwner()'),
      );

    expect(
      offenders,
      `these still call the guard with no argument, so they act on the wrong shop for a multi-shop owner: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
