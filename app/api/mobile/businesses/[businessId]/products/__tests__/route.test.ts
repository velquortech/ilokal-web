/**
 * GET /api/mobile/businesses/:businessId/products — the mobile menu projection
 * contract (the Bida Ngayon scan reads this endpoint's per-product
 * `weekly_view_count`).
 *
 * Claims under test:
 *  - the route drives `business_products` with the business id, and the menu's
 *    default "Popular" sort orders by the VIEWS-led `popularity` key (spec §4
 *    mirror) — not a ratings-only key;
 *  - a row's `weekly_view_count` flows through the response, normalized
 *    (PostgREST BIGINT-as-string → number), and an absent field maps to 0
 *    (the `Number(x ?? 0)` contract);
 *  - `sort=rating` orders by average_rating then rating_count; `sort=name`
 *    never touches `popularity`.
 *
 * NOTE: this suite mocks supabase, so it pins the ROUTE side of the contract.
 * The RPC's actual SQL projection (that `weekly_view_count` really is returned,
 * and `popularity` really is views-led) is guarded by
 * `business_products.integration.test.ts`, which runs the live function
 * against the local DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/bearer', () => ({ createBearerClient: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, bucket: string, path: string | null) =>
      path ? `https://cdn.example/${bucket}/${path}` : null,
  ),
}));

import { createBearerClient } from '@/supabase/bearer';
import { GET } from '../route';

type Row = Record<string, unknown>;

function productRow(over: Row = {}): Row {
  return {
    id: 'p1',
    name: 'Cheese Tako',
    description: null,
    price: 80,
    sale_price: null,
    price_type: 'fixed',
    price_unit: 'PHP',
    price_display: '₱80',
    image_url: 'raw/tako.jpg',
    is_available: true,
    category: null,
    average_rating: 4.7,
    rating_count: 89,
    weekly_view_count: 312,
    popularity: 312,
    kind: 'product',
    booking_mode: 'none',
    duration_minutes: null,
    lead_time_minutes: null,
    inventory_count: null,
    capacity: null,
    deposit_amount: null,
    min_duration_units: null,
    max_duration_units: null,
    service_location: 'at_business',
    ...over,
  };
}

/** Chainable, awaitable query builder mirroring the route's usage. */
function buildSupabaseMock(opts: {
  rows?: Row[];
  error?: unknown;
  count?: number;
}) {
  const orderCalls: Array<[string, unknown]> = [];
  const rpcCalls: Array<[string, unknown, unknown?]> = [];
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.or = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.gte = vi.fn(chain);
  builder.lte = vi.fn(chain);
  builder.order = vi.fn((col: string, dir: unknown) => {
    orderCalls.push([col, dir]);
    return builder;
  });
  builder.range = vi.fn(chain);
  // Awaiting the chain resolves the RPC payload (the route's final await).
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({
      data: opts.rows ?? [],
      error: opts.error ?? null,
      count: opts.count,
    });
  const supabase = {
    rpc: vi.fn((name: string, args: unknown, extra?: unknown) => {
      rpcCalls.push([name, args, extra]);
      if (name === 'business_product_categories') {
        return Promise.resolve({ data: [], error: null });
      }
      return builder;
    }),
  };
  return { supabase, orderCalls, rpcCalls };
}

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL(
    `http://localhost:3000/api/mobile/businesses/${BUSINESS_ID}/products`,
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

async function callGET(params: Record<string, string> = {}) {
  return GET(makeRequest(params), {
    params: Promise.resolve({ businessId: BUSINESS_ID }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/mobile/businesses/:id/products — projection contract', () => {
  it('drives the business_products RPC with the business id', async () => {
    const { supabase, rpcCalls } = buildSupabaseMock({ rows: [productRow()] });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    await callGET({ page: '1', per_page: '12' });

    expect(rpcCalls[0][0]).toBe('business_products');
    expect(rpcCalls[0][1]).toEqual({ p_business_id: BUSINESS_ID });
  });

  it('orders the default "Popular" sort by the views-led popularity key', async () => {
    const { supabase, orderCalls } = buildSupabaseMock({
      rows: [productRow()],
    });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    // Paginated menu requests default to `sort=popular`.
    await callGET({ page: '1', per_page: '12' });

    const popularity = orderCalls.find(([col]) => col === 'popularity');
    expect(popularity).toBeDefined();
    expect(popularity![1]).toEqual({
      ascending: false,
      nullsFirst: false,
    });
    // Stable secondary ordering by name.
    expect(orderCalls.some(([col]) => col === 'name')).toBe(true);
  });

  it('keeps the explicit popularity sort for sort=popular requests', async () => {
    const { supabase, orderCalls } = buildSupabaseMock({
      rows: [productRow()],
    });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    await callGET({ page: '1', sort: 'popular' });

    expect(orderCalls.filter(([col]) => col === 'popularity')).toHaveLength(1);
  });

  it('never orders by popularity for sort=name (legacy batch default)', async () => {
    const { supabase, orderCalls } = buildSupabaseMock({
      rows: [productRow()],
    });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    // No `page` → legacy single-batch shape, `sort` defaults to `name`.
    await callGET();

    expect(orderCalls.filter(([col]) => col === 'popularity')).toHaveLength(0);
    expect(orderCalls[0][0]).toBe('name');
  });

  it('orders sort=rating by average_rating then rating_count', async () => {
    const { supabase, orderCalls } = buildSupabaseMock({
      rows: [productRow()],
    });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    await callGET({ page: '1', sort: 'rating' });

    expect(orderCalls[0][0]).toBe('average_rating');
    expect(orderCalls[1][0]).toBe('rating_count');
    expect(orderCalls.some(([col]) => col === 'popularity')).toBe(false);
  });

  it('projects weekly_view_count through the response, normalized (BIGINT string → number)', async () => {
    const { supabase } = buildSupabaseMock({
      rows: [
        productRow({
          id: 'p1',
          weekly_view_count: '312', // PostgREST BIGINT-as-string representation
          popularity: 312,
        }),
        productRow({
          id: 'p2',
          // Absent field — the route must emit 0, not undefined/null.
          weekly_view_count: undefined,
        }),
      ],
    });
    vi.mocked(createBearerClient).mockReturnValue(
      supabase as unknown as ReturnType<typeof createBearerClient>,
    );

    const res = await callGET();
    const body = (await res.json()) as {
      products: Array<Record<string, unknown>>;
    };
    const byId = new Map<string, Record<string, unknown>>(
      body.products.map((p) => [String(p.id), p]),
    );

    expect(byId.get('p1')!.weekly_view_count).toBe(312);
    expect(byId.get('p2')!.weekly_view_count).toBe(0);
  });
});
