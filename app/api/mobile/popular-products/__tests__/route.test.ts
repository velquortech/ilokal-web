/**
 * GET /api/mobile/popular-products — the Bida Ngayon feed contract.
 *
 * Claims under test:
 *  - the route drives `popular_products_feed` with the category/sub-category/
 *    search filters + page bounds pushed down (the DB ranks and slices), and
 *    `popular_fresh_products` on page 1 only;
 *  - rows are mapped: storage paths resolved per bucket, BIGINT/numeric
 *    PostgREST representations normalised, `has_more` derived from the
 *    row-carried `total_count`;
 *  - the fresh tier is a page-1 concept: absent on later pages, and a failing
 *    fresh RPC yields `fresh: []` (the ranked board survives);
 *  - the rail never contains page-1 grid members (a fresh product that ranks
 *    on the board shows its NEW chip there — deduped from the rail);
 *  - missing lat/lng → 400; unknown category → empty result (not all results).
 */

import { describe, it, expect, vi } from 'vitest';
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

function feedRow(over: Row = {}): Row {
  return {
    product_id: 'p1',
    product_name: 'Cheese Tako',
    product_image_url: 'raw/tako.jpg',
    price: 80,
    price_type: 'from',
    price_unit: 'PHP',
    weekly_view_count: 312,
    average_rating: 4.7,
    rating_count: 89,
    business_id: 'b1',
    business_name: 'GigaGrind iCafe',
    business_logo_url: 'raw/logo.png',
    business_banner_url: 'raw/banner.jpg',
    distance_meters: 540,
    is_new: false,
    total_count: 47,
    ...over,
  };
}

function buildSupabaseMock(opts: {
  rows?: Row[];
  freshRows?: Row[];
  bidaRows?: Row[];
  feedError?: { message: string } | null;
  freshError?: { message: string } | null;
  bidaError?: { message: string } | null;
}) {
  const supabase = {
    rpc: vi.fn((name: string, _args: unknown) => {
      if (name === 'popular_products_feed') {
        return Promise.resolve({
          data: opts.rows ?? [],
          error: opts.feedError ?? null,
        });
      }
      if (name === 'popular_fresh_products') {
        return Promise.resolve({
          data: opts.freshRows ?? [],
          error: opts.freshError ?? null,
        });
      }
      if (name === 'bida_of_the_day') {
        return Promise.resolve({
          data: opts.bidaRows ?? [],
          error: opts.bidaError ?? null,
        });
      }
      throw new Error(`unexpected rpc: ${name}`);
    }),
  };
  vi.mocked(createBearerClient).mockReturnValue(
    supabase as unknown as ReturnType<typeof createBearerClient>,
  );
  return supabase;
}

function request(query: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/mobile/popular-products?${query}`,
  );
}

describe('GET /api/mobile/popular-products', () => {
  it('drives the feed RPC with filters + page bounds, and the fresh RPC on page 1', async () => {
    const { rpc } = buildSupabaseMock({
      rows: [feedRow()],
      freshRows: [feedRow({ product_id: 'f1', is_new: true })],
    });

    const res = await GET(
      request(
        'lat=10.7&lng=122.5&radius=0&category=Food&subcategory=All&q=cheese',
      ),
    );
    expect(res.status).toBe(200);

    const feedCall = rpc.mock.calls.find(
      (c) => c[0] === 'popular_products_feed',
    );
    expect(feedCall![1]).toEqual({
      lat: 10.7,
      lng: 122.5,
      radius_meters: 0,
      filter_business_type: 'Food & Beverage',
      filter_category_name: null, // the "All" sentinel maps to no filter
      search: 'cheese',
      page_size: 10,
      page_offset: 0,
    });

    const freshCall = rpc.mock.calls.find(
      (c) => c[0] === 'popular_fresh_products',
    );
    expect(freshCall![1]).toMatchObject({
      limit_count: 5,
      filter_business_type: 'Food & Beverage',
    });
  });

  it('resolves storage URLs per bucket and normalises numeric types', async () => {
    // PostgREST serialises BIGINT (rating_count, total_count) as strings and
    // NUMERIC (price, average_rating) as JSON numbers — both must normalise.
    buildSupabaseMock({
      rows: [
        feedRow({
          rating_count: '89',
          total_count: '47',
          price: '80',
          average_rating: '4.7',
        }),
      ],
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    const body = (await res.json()) as {
      products: Row[];
      total: number;
      has_more: boolean;
    };

    expect(body.products[0]).toMatchObject({
      product_image_url: 'https://cdn.example/product-images/raw/tako.jpg',
      business_logo_url: 'https://cdn.example/shop-logos/raw/logo.png',
      business_banner_url: 'https://cdn.example/shop-banners/raw/banner.jpg',
      price: 80,
      average_rating: 4.7,
      rating_count: 89,
    });
    expect(body.total).toBe(47);
    expect(body.has_more).toBe(true); // 1 of 47 loaded on page 1
  });

  it('derives has_more from the row-carried total_count', async () => {
    buildSupabaseMock({
      rows: [feedRow({ total_count: '3' }), feedRow({ product_id: 'p2' })],
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    const body = (await res.json()) as { total: number; has_more: boolean };
    expect(body.total).toBe(3);
    expect(body.has_more).toBe(true);
  });

  it('omits the fresh tier on pages beyond 1 (page-1-only concept)', async () => {
    const { rpc } = buildSupabaseMock({ rows: [feedRow()] });

    const res = await GET(request('lat=10.7&lng=122.5&page=2'));
    const body = (await res.json()) as Record<string, unknown>;

    expect('fresh' in body).toBe(false);
    expect(rpc.mock.calls.some((c) => c[0] === 'popular_fresh_products')).toBe(
      false,
    );
  });

  it('returns the Bida of the Day on page 1, resolved like a feed row', async () => {
    buildSupabaseMock({
      rows: [feedRow()],
      bidaRows: [
        feedRow({
          product_id: 'star1',
          product_name: 'Live Music Night Entry',
          business_name: 'The Lampara Live Music Bar',
          is_new: true,
        }),
      ],
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    const body = (await res.json()) as { bida_of_the_day: Row };
    expect(body.bida_of_the_day).toMatchObject({
      product_id: 'star1',
      product_name: 'Live Music Night Entry',
      business_name: 'The Lampara Live Music Bar',
      is_new: true,
    });
  });

  it('keeps the board when the Bida of the Day RPC fails (null, not an error)', async () => {
    buildSupabaseMock({
      rows: [feedRow()],
      bidaError: { message: 'star boom' },
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: Row[];
      bida_of_the_day: Row | null;
    };
    expect(body.products).toHaveLength(1);
    expect(body.bida_of_the_day).toBeNull();
  });

  it('omits the Bida of the Day on pages beyond 1 (page-1 concept)', async () => {
    const { rpc } = buildSupabaseMock({ rows: [feedRow()] });

    const res = await GET(request('lat=10.7&lng=122.5&page=2'));
    const body = (await res.json()) as Record<string, unknown>;

    expect('bida_of_the_day' in body).toBe(false);
    expect(rpc.mock.calls.some((c) => c[0] === 'bida_of_the_day')).toBe(false);
  });

  it('drops page-1 grid members from the fresh rail (no duplication)', async () => {
    // The widened fresh tier (20260814120000) lets launch-week products at
    // established businesses rank high — e.g. grid #1 "Clothing Alteration" —
    // so the route must not return it in BOTH the board and the rail.
    buildSupabaseMock({
      rows: [
        feedRow({ product_id: 'p1', is_new: true }),
        feedRow({ product_id: 'p2', is_new: false }),
      ],
      freshRows: [
        feedRow({ product_id: 'p1', is_new: true }), // grid member — deduped
        feedRow({ product_id: 'f1', is_new: true }), // beyond the grid — kept
      ],
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    const body = (await res.json()) as { fresh: Row[] };
    expect(body.fresh).toHaveLength(1);
    expect(body.fresh[0].product_id).toBe('f1');
  });

  it('keeps the ranked board when the fresh RPC fails (fresh hides, not the board)', async () => {
    buildSupabaseMock({
      rows: [feedRow()],
      freshError: { message: 'fresh boom' },
    });

    const res = await GET(request('lat=10.7&lng=122.5'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: Row[];
      fresh: Row[];
    };
    expect(body.products).toHaveLength(1);
    expect(body.fresh).toEqual([]);
  });

  it('rejects a request without lat/lng', async () => {
    const res = await GET(request('radius=0'));
    expect(res.status).toBe(400);
  });

  it('returns an empty result (not all results) for an unknown category', async () => {
    const { rpc } = buildSupabaseMock({});
    const res = await GET(request('lat=10.7&lng=122.5&category=Nope'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: Row[];
      total: number;
      has_more: boolean;
    };
    expect(body).toEqual({
      products: [],
      total: 0,
      page: 1,
      per_page: 10,
      has_more: false,
    });
    // No RPC round-trips for a category the route knows can't match.
    expect(rpc).not.toHaveBeenCalled();
  });
});
