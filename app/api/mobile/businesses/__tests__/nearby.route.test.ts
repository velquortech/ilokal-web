/**
 * GET /api/mobile/businesses/nearby — optimized filter-aware feed contract.
 *
 * Claims under test:
 *  - the route drives ONE `nearby_businesses_filtered` RPC call, passing the
 *    category/sub-category/search filters down (so the DB filters before any
 *    aggregation — the whole point of the revamp), and derives `has_more`
 *    from the row-carried `total_count`;
 *  - the response carries `category_counts` (radius-wide, BIGINT-normalised)
 *    in BOTH the paged and the legacy limit shapes, independent of the active
 *    category filter;
 *  - an unknown category key yields an empty result (not all results).
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
import { GET } from '../nearby/route';

type Row = Record<string, unknown>;

function buildSupabaseMock(opts: {
  rows?: Row[];
  followers?: { business_id: string; follower_count: number | string }[];
  counts?: {
    business_type: string | null;
    category_name: string | null;
    count: number | string;
  }[];
  rpcError?: { message: string } | null;
}) {
  const supabase = {
    rpc: vi.fn((name: string, ..._args: unknown[]) => {
      if (name === 'nearby_businesses_filtered') {
        return Promise.resolve({
          data: opts.rows ?? [],
          error: opts.rpcError ?? null,
        });
      }
      if (name === 'get_follower_counts') {
        return Promise.resolve({ data: opts.followers ?? [] });
      }
      if (name === 'nearby_business_type_counts') {
        return Promise.resolve({ data: opts.counts ?? [] });
      }
      throw new Error(`unexpected rpc: ${name}`);
    }),
  };
  vi.mocked(createBearerClient).mockReturnValue(
    supabase as unknown as ReturnType<typeof createBearerClient>,
  );
  return supabase;
}

function feedRow(over: Row = {}): Row {
  return {
    branch_id: 'branch-1',
    branch_name: 'LU2',
    address: 'E Lopez, Iloilo City',
    branch_lat: 10.71,
    branch_lng: 122.56,
    distance_meters: 262,
    business_id: 'biz-1',
    business_name: 'LU2',
    business_description: 'Crispy bagnet house',
    logo_url: 'raw/logo.jpg',
    banner_url: null,
    interior_images: [],
    business_type: 'Food & Beverage',
    category_name: 'Restaurant',
    is_featured: false,
    weekly_view_count: 12,
    is_trending: false,
    is_new: false,
    // Ratings now travel with the feed rows (tallied in the RPC's page stage).
    average_rating: 5,
    rating_count: 1,
    total_count: 1,
    ...over,
  };
}

function request(query: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/mobile/businesses/nearby?${query}`,
  );
}

describe('GET /api/mobile/businesses/nearby', () => {
  it('drives ONE filtered RPC with the category/search filters pushed down', async () => {
    const { rpc } = buildSupabaseMock({
      rows: [feedRow()],
      followers: [{ business_id: 'biz-1', follower_count: '3' }],
      counts: [],
    });

    const res = await GET(
      request(
        'lat=10.7&lng=122.5&page=1&per_page=10&category=Food&subcategory=Restaurant&q=bagnet',
      ),
    );
    expect(res.status).toBe(200);

    const nearbyCall = rpc.mock.calls.find(
      (c) => c[0] === 'nearby_businesses_filtered',
    );
    expect(nearbyCall).toBeDefined();
    // The DB does the filtering — the route passes the mapped business type,
    // the sub-category name, the search term, and the page bounds through.
    expect(nearbyCall![1]).toEqual({
      lat: 10.7,
      lng: 122.5,
      radius_meters: 5000,
      filter_business_type: 'Food & Beverage',
      filter_category_name: 'Restaurant',
      search: 'bagnet',
      page_size: 10,
      page_offset: 0,
      sort_featured_first: false,
    });
    // No other business-rows round-trip (no ratings re-fetch).
    expect(
      rpc.mock.calls.filter((c) => c[0].startsWith('nearby_businesses')),
    ).toHaveLength(1);
  });

  it('maps the four launch vertical keys to their business types (20260815000000)', async () => {
    const { rpc } = buildSupabaseMock({
      rows: [feedRow()],
      followers: [],
      counts: [],
    });

    // One representative key per vertical — the map is a plain record, so the
    // four entries share one code path; this pins the keys the mobile app
    // sends (MAIN_CATEGORIES keys) against the DB business_types names.
    for (const [key, type] of [
      ['Entertainment', 'Entertainment & Events'],
      ['Health', 'Health & Wellness'],
      ['Education', 'Education & Learning'],
      ['Home', 'Home & Property Services'],
    ] as const) {
      rpc.mockClear();
      await GET(
        request(`lat=10.7&lng=122.5&page=1&per_page=10&category=${key}`),
      );
      const nearbyCall = rpc.mock.calls.find(
        (c) => c[0] === 'nearby_businesses_filtered',
      );
      expect(nearbyCall).toBeDefined();
      const args = nearbyCall![1] as { filter_business_type?: string };
      expect(args.filter_business_type).toBe(type);
    }
  });

  it('includes category_counts (normalised to numbers) in the paged shape', async () => {
    buildSupabaseMock({
      rows: [feedRow()],
      followers: [{ business_id: 'biz-1', follower_count: '3' }],
      counts: [
        { business_type: 'Food & Beverage', category_name: 'Café', count: '2' },
        {
          business_type: 'Services',
          category_name: 'Salon / Barbershop',
          count: '1',
        },
      ],
    });

    const res = await GET(request('lat=10.7&lng=122.5&page=1&per_page=10'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.category_counts).toEqual([
      { business_type: 'Food & Beverage', category_name: 'Café', count: 2 },
      {
        business_type: 'Services',
        category_name: 'Salon / Barbershop',
        count: 1,
      },
    ]);
    expect(body.businesses).toHaveLength(1);
    expect(body.businesses[0].business_name).toBe('LU2');
    expect(body.businesses[0].average_rating).toBe(5);
    expect(body.businesses[0].total_followers).toBe(3);
  });

  it('derives has_more from the row-carried total_count (paged)', async () => {
    buildSupabaseMock({
      rows: [feedRow({ total_count: 25 })],
      followers: [],
      counts: [],
    });

    const res = await GET(request('lat=10.7&lng=122.5&page=2&per_page=10'));
    const body = await res.json();

    // page 2 of 25 → 10 already seen, 15 remain.
    expect(body.total).toBe(25);
    expect(body.has_more).toBe(true);
  });

  it('includes category_counts in the legacy limit shape too', async () => {
    const { rpc } = buildSupabaseMock({
      rows: [feedRow()],
      followers: [],
      counts: [
        {
          business_type: 'Retail',
          category_name: 'Specialty Shop',
          count: '4',
        },
      ],
    });

    const res = await GET(request('lat=10.7&lng=122.5&limit=3'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.category_counts).toEqual([
      { business_type: 'Retail', category_name: 'Specialty Shop', count: 4 },
    ]);
    expect(body.has_more).toBeUndefined();

    // Legacy path: featured-first ordering, no page offset.
    const nearbyCall = rpc.mock.calls.find(
      (c) => c[0] === 'nearby_businesses_filtered',
    );
    expect(nearbyCall![1]).toMatchObject({
      page_size: 3,
      page_offset: 0,
      sort_featured_first: true,
    });
  });

  it('normalises rating_count / average_rating to numbers (BIGINT comes back as a string)', async () => {
    buildSupabaseMock({
      rows: [feedRow({ average_rating: '4.5', rating_count: '7' })],
      followers: [],
      counts: [],
    });

    const res = await GET(request('lat=10.7&lng=122.5&page=1&per_page=10'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // PostgREST returns BIGINT (rating_count) as a string — the route must
    // normalise it to a number so the mobile contract stays numeric.
    expect(body.businesses[0].average_rating).toBe(4.5);
    expect(body.businesses[0].rating_count).toBe(7);
  });

  it('legacy shape without page OR limit returns ALL rows (page_size NULL, distance order)', async () => {
    const { rpc } = buildSupabaseMock({
      rows: Array.from({ length: 3 }, (_, i) =>
        feedRow({ branch_id: `branch-${i}` }),
      ),
      followers: [],
      counts: [],
    });

    // No page, no limit — the web "Shops near me" page hits this shape and
    // expects every nearby shop, not a capped screenful.
    const res = await GET(request('lat=10.7&lng=122.5'));
    expect(res.status).toBe(200);
    const body = await res.json();

    const nearbyCall = rpc.mock.calls.find(
      (c) => c[0] === 'nearby_businesses_filtered',
    );
    expect(nearbyCall).toBeDefined();
    // NULL page_size → the RPC applies no LIMIT; no featured-first bias (this
    // is the distance-ordered "shops near me" listing, not the Home preview).
    expect(nearbyCall![1]).toMatchObject({
      page_size: null,
      page_offset: 0,
      sort_featured_first: false,
    });
    expect(body.businesses).toHaveLength(3);
    expect(body.has_more).toBeUndefined();
  });

  it('keeps the counts independent of the active category filter', async () => {
    const { rpc } = buildSupabaseMock({
      rows: [feedRow()],
      followers: [],
      counts: [
        { business_type: 'Food & Beverage', category_name: 'Café', count: '2' },
        {
          business_type: 'Retail',
          category_name: 'Specialty Shop',
          count: '4',
        },
      ],
    });

    // Browse Food only — the availability aggregate must still report Retail.
    await GET(request('lat=10.7&lng=122.5&page=1&per_page=10&category=Food'));

    // The counts RPC was called with the plain radius args (no category).
    const countsCall = rpc.mock.calls.find(
      (c) => c[0] === 'nearby_business_type_counts',
    );
    expect(countsCall).toBeDefined();
    expect(countsCall![1]).toEqual({
      lat: 10.7,
      lng: 122.5,
      radius_meters: 5000,
    });
  });

  it('returns an empty result (not all results) for an unknown category key', async () => {
    const { rpc } = buildSupabaseMock({ rows: [feedRow()], counts: [] });

    const res = await GET(
      request('lat=10.7&lng=122.5&page=1&per_page=10&category=Nope'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.businesses).toEqual([]);
    expect(body.has_more).toBe(false);
    // The feed RPC was never hit.
    expect(
      rpc.mock.calls.some((c) => c[0] === 'nearby_businesses_filtered'),
    ).toBe(false);
  });
});
