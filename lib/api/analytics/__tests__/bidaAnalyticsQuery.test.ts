/**
 * getBidaAnalytics — the payload computation from view_count_history.
 *
 * Fixture mirrors the local seed: an owner with three items — the board
 * contender (rank 1 today, 40 last week), a sibling with history but no
 * global rank, and an unavailable item with no history rows at all.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { getBidaAnalytics } from '../bidaAnalyticsQuery';
import { createAnalyticsSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createAnalyticsSupabaseClient: vi.fn(),
}));

function makeChain(result: {
  data: unknown;
  error: null;
}): Record<string, unknown> {
  const obj: Record<string, unknown> = { ...result };
  for (const m of ['select', 'eq', 'is', 'gte', 'single']) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  return obj;
}

function buildSupabase(opts: {
  business: unknown;
  products: unknown;
  history: unknown;
}) {
  const tables: Record<string, ReturnType<typeof makeChain>> = {
    businesses: makeChain({ data: opts.business, error: null }),
    products: makeChain({ data: opts.products, error: null }),
    view_count_history: makeChain({ data: opts.history, error: null }),
  };
  const supabase = {
    from: vi.fn((t: string) => tables[t]),
    storage: {
      from: vi.fn((_bucket: string) => ({
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://cdn.example/${path}` },
        })),
      })),
    },
  };
  (createAnalyticsSupabaseClient as Mock).mockResolvedValue(supabase as never);
}

function dateAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

type HistoryRow = {
  product_id: string;
  business_id: string;
  snapshot_date: string;
  weekly_view_count: number;
  trend_score: number;
  global_rank: number | null;
};

/**
 * History rows for one product. `counts` is oldest → newest (14 entries,
 * index 13 = today). `ranks` is indexed by DAYS AGO (0 = today), only set for
 * the business's board contender.
 */
function historyFor(
  productId: string,
  counts: number[],
  ranksByDayAgo: Record<number, number> = {},
): HistoryRow[] {
  return counts.map((count, i) => {
    const dayAgo = counts.length - 1 - i;
    return {
      product_id: productId,
      business_id: 'biz-1',
      snapshot_date: dateAgo(dayAgo),
      weekly_view_count: count,
      trend_score: count,
      global_rank: ranksByDayAgo[dayAgo] ?? null,
    };
  });
}

const CONTENDER_COUNTS = [
  890, 809, 978, 969, 984, 1028, 1007, 1230, 1101, 1205, 1274, 1293, 1296, 1499,
];
// Rank 1 today, 24 yesterday, 30s mid-week, 40+ last week.
const CONTENDER_RANKS = {
  0: 1,
  1: 24,
  2: 34,
  3: 33,
  4: 32,
  5: 31,
  6: 30,
  7: 40,
  8: 41,
  9: 42,
  10: 43,
  11: 44,
  12: 45,
  13: 46,
};
const SIBLING_COUNTS = [
  577, 647, 728, 644, 666, 727, 855, 873, 901, 930, 965, 1002, 1048, 1105,
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getBidaAnalytics', () => {
  it('computes the summary, catalog ranks, deltas, and sparklines', async () => {
    buildSupabase({
      business: {
        id: 'biz-1',
        shop_name: 'FixRight Repair Hub',
        logo_url: 'raw/logo.jpg',
      },
      products: [
        {
          id: 'p-contender',
          name: 'Clothing Alteration',
          price: 150,
          image_url: 'raw/clothing.jpg',
          is_available: true,
          weekly_view_count: 1499,
        },
        {
          id: 'p-sibling',
          name: 'Laptop Repair',
          price: 350,
          image_url: 'raw/laptop.jpg',
          is_available: true,
          weekly_view_count: 1105,
        },
        {
          id: 'p-off',
          name: 'Phone Screen Repair',
          price: 199,
          image_url: 'raw/phone.jpg',
          is_available: false,
          weekly_view_count: 435,
        },
      ],
      history: [
        ...historyFor('p-contender', CONTENDER_COUNTS, CONTENDER_RANKS),
        ...historyFor('p-sibling', SIBLING_COUNTS),
      ],
    });

    const payload = await getBidaAnalytics('biz-1');

    // Business + storage URLs resolved.
    expect(payload.business.shop_name).toBe('FixRight Repair Hub');
    expect(payload.business.logo_url).toBe('https://cdn.example/raw/logo.jpg');

    // Window: the last 7 days.
    expect(payload.window.end).toBe(dateAgo(0));
    expect(payload.window.start).toBe(dateAgo(6));

    // Summary: totals, this-vs-last-week delta, best rank + rank delta.
    expect(payload.summary.total_weekly_views).toBe(3039);
    // 1499+1105 today minus 1007+855 a week ago (unavailable item has no row).
    expect(payload.summary.total_views_delta).toBe(1177);
    expect(payload.summary.best_bida_rank).toBe(1);
    expect(payload.summary.best_bida_rank_delta).toBe(39); // 40 → 1
    expect(payload.summary.on_board).toBe(true);
  });

  it('ranks items by views and gives the contender its global rank', async () => {
    buildSupabase({
      business: {
        id: 'biz-1',
        shop_name: 'FixRight Repair Hub',
        logo_url: null,
      },
      products: [
        {
          id: 'p-sibling',
          name: 'Laptop Repair',
          price: 350,
          image_url: null,
          is_available: true,
          weekly_view_count: 1105,
        },
        {
          id: 'p-contender',
          name: 'Clothing Alteration',
          price: 150,
          image_url: null,
          is_available: true,
          weekly_view_count: 1499,
        },
      ],
      history: [
        ...historyFor('p-contender', CONTENDER_COUNTS, CONTENDER_RANKS),
        ...historyFor('p-sibling', SIBLING_COUNTS),
      ],
    });

    const payload = await getBidaAnalytics('biz-1');

    // Views-descending order.
    expect(payload.products.map((p) => p.product_name)).toEqual([
      'Clothing Alteration',
      'Laptop Repair',
    ]);

    const contender = payload.products[0];
    expect(contender.catalog_rank).toBe(1);
    expect(contender.bida_rank).toBe(1);
    expect(contender.bida_rank_delta).toBe(39); // up 39 spots (positive = up)
    expect(contender.in_bida_board).toBe(true);
    expect(contender.views_delta).toBe(1499 - 1007); // vs the week-ago row
    expect(contender.spark).toHaveLength(14);
    expect(contender.spark[13]).toBe(1499);

    const sibling = payload.products[1];
    expect(sibling.catalog_rank).toBe(2);
    expect(sibling.bida_rank).toBeNull(); // one board contender per business
    expect(sibling.bida_rank_delta).toBeNull();
    expect(sibling.in_bida_board).toBe(false);
    expect(sibling.views_delta).toBe(1105 - 855);
  });

  it('keeps unavailable items (live count, no history) honest', async () => {
    buildSupabase({
      business: { id: 'biz-1', shop_name: 'Shop', logo_url: null },
      products: [
        {
          id: 'p-off',
          name: 'Phone Screen Repair',
          price: 199,
          image_url: null,
          is_available: false,
          weekly_view_count: 435,
        },
      ],
      history: [],
    });

    const payload = await getBidaAnalytics('biz-1');

    expect(payload.products).toHaveLength(1);
    const off = payload.products[0];
    expect(off.weekly_views).toBe(435);
    expect(off.views_delta).toBeNull(); // no history yet
    expect(off.spark.every((v) => v == null)).toBe(true);
    expect(off.bida_rank).toBeNull();
    expect(off.catalog_rank).toBe(1); // the only item
    expect(payload.summary.total_weekly_views).toBe(435);
    expect(payload.summary.total_views_delta).toBeNull();
    expect(payload.summary.best_bida_rank).toBeNull();
    expect(payload.summary.on_board).toBe(false);
  });
});
