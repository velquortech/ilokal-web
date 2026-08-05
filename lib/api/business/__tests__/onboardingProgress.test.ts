/**
 * The post-registration setup checklist.
 *
 * Three claims worth a test. That the counts are COUNT-ONLY reads, because the
 * alternative — `select(...)` then `.length` — is silently wrong past the
 * PostgREST 1000-row cap. That a failed read reports `failed`, because six
 * unchecked boxes and an outage look identical otherwise, and an unchecked box
 * tells the owner to redo work they already did. And that a step is only
 * "done" when the underlying data is genuinely usable — an unpinned branch, a
 * draft promo and an empty `operating_hours` object are each the shape of a
 * job that looks finished and isn't.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { getOnboardingProgress } from '../onboardingQuery';
import { resolveOfferingVocabulary } from '@/lib/utils/offeringVocabulary';
import type { OnboardingItemId } from '@/lib/types/onboarding';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

const VOCAB = resolveOfferingVocabulary(null, 'products');

interface RecordedQuery {
  table: string;
  select: unknown[][];
  eq: unknown[][];
  is: unknown[][];
  not: unknown[][];
  lte: unknown[][];
  gte: unknown[][];
}

type Row = Record<string, unknown> | null;

interface TableFixtures {
  businesses?: { data: Row; error?: unknown };
  branches?: { count: number; error?: unknown };
  business_settings?: { data: Row; error?: unknown };
  products?: { count: number; error?: unknown };
  coupons?: { count: number; error?: unknown };
}

const COMPLETE: TableFixtures = {
  businesses: {
    data: {
      logo_url: 'shops/logo.webp',
      banner_url: 'shops/banner.webp',
      description: 'A cozy test cafe',
      status: 'verified',
    },
  },
  branches: { count: 1 },
  business_settings: {
    data: {
      operating_hours: { mon: { open: '09:00', close: '18:00' } },
      contact_phone_public: '0917 000 0000',
    },
  },
  products: { count: 12 },
  coupons: { count: 3 },
};

/** Keyed by table, not by call order — the reads run in one `Promise.all`. */
function mockTables(fixtures: TableFixtures) {
  const queries: RecordedQuery[] = [];

  const from = vi.fn((table: string) => {
    const recorded: RecordedQuery = {
      table,
      select: [],
      eq: [],
      is: [],
      not: [],
      lte: [],
      gte: [],
    };
    queries.push(recorded);

    const fixture = (fixtures as Record<string, unknown>)[table] as
      | { data?: Row; count?: number; error?: unknown }
      | undefined;

    const result = {
      data: fixture?.data ?? null,
      count: fixture?.count ?? 0,
      error: fixture?.error ?? null,
    };

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
      not: (...args: unknown[]) => {
        recorded.not.push(args);
        return proxy;
      },
      lte: (...args: unknown[]) => {
        recorded.lte.push(args);
        return proxy;
      },
      gte: (...args: unknown[]) => {
        recorded.gte.push(args);
        return proxy;
      },
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };

    return proxy;
  });

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { from, queries };
}

const byId = (
  items: { id: OnboardingItemId; done: boolean }[],
  id: OnboardingItemId,
) => items.find((item) => item.id === id)!;

const queryFor = (queries: RecordedQuery[], table: string) =>
  queries.find((query) => query.table === table)!;

beforeEach(() => vi.clearAllMocks());

describe('getOnboardingProgress', () => {
  it('marks every actionable step done for a fully set-up shop', async () => {
    mockTables(COMPLETE);

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(progress.failed).toBe(false);
    expect(progress.complete).toBe(true);
    expect(progress.completed).toBe(progress.total);
    expect(progress.offeringCount).toBe(12);
  });

  it('excludes the verification row from BOTH sides of the ratio', async () => {
    mockTables(COMPLETE);

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    // Six rows rendered, five of them the owner's to action. Counting a step
    // nobody can take would leave the bar permanently short.
    expect(progress.items).toHaveLength(6);
    expect(progress.total).toBe(5);
    expect(byId(progress.items, 'verification')).toMatchObject({
      readOnly: true,
      status: 'verified',
    });
  });

  it('asks the three counts for a count and no rows', async () => {
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    for (const table of ['branches', 'products', 'coupons']) {
      expect(queryFor(queries, table).select[0]).toEqual([
        'id',
        { count: 'exact', head: true },
      ]);
    }
  });

  it('scopes every read to the one shop', async () => {
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(queryFor(queries, 'businesses').eq).toContainEqual([
      'id',
      BUSINESS_ID,
    ]);
    for (const table of [
      'branches',
      'business_settings',
      'products',
      'coupons',
    ]) {
      expect(queryFor(queries, table).eq).toContainEqual([
        'business_id',
        BUSINESS_ID,
      ]);
    }
  });

  it('only counts branches that are actually pinned', async () => {
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    // A branch with no `location` is invisible to `nearby_businesses`, so it
    // is not a finished step — it is a shop nobody can find.
    expect(queryFor(queries, 'branches').not).toContainEqual([
      'location',
      'is',
      null,
    ]);
  });

  it('only counts published promos, and only live rows', async () => {
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    const coupons = queryFor(queries, 'coupons');
    expect(coupons.eq).toContainEqual(['status', 'published']);
    expect(coupons.is).toContainEqual(['archived_at', null]);
    expect(queryFor(queries, 'products').is).toContainEqual([
      'archived_at',
      null,
    ]);
  });

  it('counts a promo the owner ever published, expired or not', async () => {
    // The live window (`start_date <= now <= expiry_date`) was tried and
    // reverted: it makes done-ness expire with the CLOCK, so the moment a
    // mature shop's last deal ran out the completed checklist reappeared and
    // told the owner to publish their first one. A setup checklist records that
    // a thing was learned; whether a deal is running now is the deals page's
    // job.
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    const coupons = queryFor(queries, 'coupons');
    expect(coupons.lte).toHaveLength(0);
    expect(coupons.gte).toHaveLength(0);
  });

  it('counts offerings twice, because the two consumers ask different things', async () => {
    // The checklist row asks "is anything VISIBLE to a shopper"
    // (`status='active'`); the dashboard's empty state asks "has this owner
    // added anything AT ALL". Sharing one number told a shop whose whole
    // catalogue is `unlisted` that it had "No products yet".
    const { queries } = mockTables(COMPLETE);

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    const productReads = queries.filter((query) => query.table === 'products');
    expect(productReads).toHaveLength(2);
    expect(
      productReads.filter((read) =>
        read.eq.some(
          ([column, value]) => column === 'status' && value === 'active',
        ),
      ),
    ).toHaveLength(1);
    expect(progress.totalOfferingCount).toBe(12);
  });

  it('only counts offerings a shopper can actually see', async () => {
    // `sync_product_availability` sets `is_available = (status = 'active')`, so
    // an unlisted or disabled offering leaves the public page empty — which is
    // the state this step exists to move the owner out of. The same count feeds
    // the dashboard's empty state.
    const { queries } = mockTables(COMPLETE);

    await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(queryFor(queries, 'products').eq).toContainEqual([
      'status',
      'active',
    ]);
  });

  it('names the suspended state instead of calling it "in review"', async () => {
    // A Record over the status union, not nested ternaries: the else branch used
    // to tell a suspended shop "Verification in review — nothing to do".
    const { items } = await (async () => {
      mockTables({
        ...COMPLETE,
        businesses: {
          data: { ...COMPLETE.businesses!.data, status: 'suspended' },
        },
      });
      return getOnboardingProgress(BUSINESS_ID, VOCAB);
    })();

    const verification = items.find((item) => item.id === 'verification')!;
    expect(verification.label).toMatch(/suspended/i);
    expect(verification.label).not.toMatch(/in review/i);
    expect(verification.done).toBe(false);
  });

  it('treats a missing settings row as not-done, not as an error', async () => {
    // The row is created lazily on first save, so most shops have none.
    mockTables({ ...COMPLETE, business_settings: { data: null } });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(progress.failed).toBe(false);
    expect(byId(progress.items, 'hours').done).toBe(false);
  });

  it('does not accept an empty operating_hours object as hours', async () => {
    mockTables({
      ...COMPLETE,
      business_settings: {
        data: { operating_hours: {}, contact_phone_public: '0917 000 0000' },
      },
    });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(byId(progress.items, 'hours').done).toBe(false);
  });

  it('does not accept a blank string as a filled profile field', async () => {
    mockTables({
      ...COMPLETE,
      businesses: {
        data: {
          logo_url: 'shops/logo.webp',
          banner_url: '   ',
          description: 'A cozy test cafe',
          status: 'verified',
        },
      },
    });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(byId(progress.items, 'profile').done).toBe(false);
    expect(progress.complete).toBe(false);
  });

  it('names the offering step with the shop’s own vocabulary', async () => {
    mockTables(COMPLETE);

    const services = resolveOfferingVocabulary(
      { services: { singular: 'Service', plural: 'Services' } },
      'services',
    );
    const progress = await getOnboardingProgress(BUSINESS_ID, services);

    expect(byId(progress.items, 'offering').label).toBe('Add Service');
  });

  it('reports a failed read instead of unchecked boxes', async () => {
    mockTables({
      ...COMPLETE,
      products: { count: 0, error: { message: 'x' } },
    });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(progress.failed).toBe(true);
    // No half-built list either — a partial checklist is the same lie.
    expect(progress.items).toEqual([]);
  });

  it('reports failure when the business row is missing', async () => {
    mockTables({ ...COMPLETE, businesses: { data: null } });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(progress.failed).toBe(true);
  });

  it('reports failure when the client itself throws', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValue(
      new Error('no db'),
    );

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    expect(progress).toMatchObject({ failed: true, complete: false });
  });

  it('keeps the verification row undone for a pending shop', async () => {
    mockTables({
      ...COMPLETE,
      businesses: {
        data: { ...(COMPLETE.businesses!.data as object), status: 'pending' },
      },
    });

    const progress = await getOnboardingProgress(BUSINESS_ID, VOCAB);

    const verification = byId(progress.items, 'verification');
    expect(verification.done).toBe(false);
    // Still complete: the owner has done everything that is theirs to do.
    expect(progress.complete).toBe(true);
  });
});
