/**
 * GET /api/mobile/popular-products/facets — the Sub-category sheet counts.
 *
 * Claims under test:
 *  - the route drives `popular_products_facets` with the radius/business-type/
 *    search filters pushed down, and normalises PostgREST's BIGINT-as-string
 *    counts back to numbers;
 *  - unknown category keys yield empty facets (not all results) — same rule
 *    as the popular-products feed route;
 *  - missing lat/lng → 400.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/bearer', () => ({ createBearerClient: vi.fn() }));

import { createBearerClient } from '@/supabase/bearer';
import { GET } from '../route';

const mockedClient = vi.mocked(createBearerClient);

function makeRequest(params: Record<string, string>) {
  const url = new URL(
    'http://localhost:3000/api/mobile/popular-products/facets',
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/mobile/popular-products/facets', () => {
  it('drives the facets RPC with mapped filters and returns the count record', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { category_name: 'Bakery / Pastry Shop', product_count: '21' },
        { category_name: 'Café', product_count: '13' },
      ],
      error: null,
    });
    mockedClient.mockReturnValue({ rpc } as never);

    const res = await GET(
      makeRequest({
        lat: '10.7',
        lng: '122.57',
        radius: '0',
        category: 'Food',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facets).toEqual([
      { name: 'Bakery / Pastry Shop', count: 21 },
      { name: 'Café', count: 13 },
    ]);
    expect(rpc).toHaveBeenCalledWith('popular_products_facets', {
      lat: 10.7,
      lng: 122.57,
      radius_meters: 0,
      filter_business_type: 'Food & Beverage',
      search: null,
    });
  });

  it('passes the search term through when given', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    mockedClient.mockReturnValue({ rpc } as never);

    await GET(
      makeRequest({
        lat: '10.7',
        lng: '122.57',
        radius: '20000',
        category: 'Retail',
        q: 'artisan',
      }),
    );
    expect(rpc).toHaveBeenCalledWith('popular_products_facets', {
      lat: 10.7,
      lng: 122.57,
      radius_meters: 20000,
      filter_business_type: 'Retail',
      search: 'artisan',
    });
  });

  it('returns empty facets for an unknown category (mirrors the feed route)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    mockedClient.mockReturnValue({ rpc } as never);

    const res = await GET(
      makeRequest({ lat: '10.7', lng: '122.57', category: 'Nope' }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).facets).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('400s when lat/lng are missing', async () => {
    const res = await GET(makeRequest({ radius: '0' }));
    expect(res.status).toBe(400);
  });
});
