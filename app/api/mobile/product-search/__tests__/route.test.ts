/**
 * GET /api/mobile/product-search — the Home search bar's full-catalog product
 * probe.
 *
 * Claims under test:
 *  - missing/empty q → 400 (the full-catalog probe is never an unfiltered
 *    dump);
 *  - the route drives `product_search` with the query and a clamped limit;
 *  - rows are mapped the same as the feed: storage paths resolved per bucket,
 *    BIGINT/numeric PostgREST representations normalised;
 *  - the wire shape is the SAME as the popular-products feed's, so the app's
 *    mapWireToPopularProduct works unchanged.
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

function searchRow(over: Row = {}): Row {
  return {
    product_id: 'p1',
    product_name: 'Butter Mochi',
    product_image_url: 'raw/mochi.jpg',
    price: 120,
    price_type: 'from',
    price_unit: 'PHP',
    weekly_view_count: 12,
    average_rating: 4.2,
    rating_count: 7,
    business_id: 'b1',
    business_name: 'Iloilo Bake Lab',
    business_logo_url: 'raw/logo.png',
    business_banner_url: 'raw/banner.jpg',
    distance_meters: null,
    is_new: false,
    ...over,
  };
}

function buildSupabaseMock(opts: {
  rows?: Row[];
  error?: { message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue({ data: opts.rows, error: opts.error });
  (createBearerClient as ReturnType<typeof vi.fn>).mockReturnValue({
    rpc,
  });
  return { rpc };
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/mobile/product-search');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/mobile/product-search', () => {
  it('rejects a missing or empty q with 400', async () => {
    const { rpc } = buildSupabaseMock({ rows: [searchRow()] });

    const missing = await GET(makeRequest());
    expect(missing.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();

    const blank = await GET(makeRequest({ q: '   ' }));
    expect(blank.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('drives product_search with the trimmed query and clamps the limit', async () => {
    const { rpc } = buildSupabaseMock({ rows: [searchRow()] });

    const res = await GET(makeRequest({ q: '  mochi  ', limit: '999' }));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('product_search', {
      search: 'mochi',
      limit_count: 20,
    });
  });

  it('defaults the limit to 10 when absent or non-numeric', async () => {
    const { rpc } = buildSupabaseMock({ rows: [] });

    await GET(makeRequest({ q: 'mochi' }));
    expect(rpc).toHaveBeenCalledWith('product_search', {
      search: 'mochi',
      limit_count: 10,
    });

    await GET(makeRequest({ q: 'mochi', limit: 'abc' }));
    expect(rpc).toHaveBeenLastCalledWith('product_search', {
      search: 'mochi',
      limit_count: 10,
    });
  });

  it('maps rows to the feed wire shape (storage URLs + numeric normalisation)', async () => {
    buildSupabaseMock({
      rows: [
        searchRow({
          price: '120',
          average_rating: '4.2',
          rating_count: '7',
          weekly_view_count: 12,
        }),
      ],
    });

    const res = await GET(makeRequest({ q: 'mochi' }));
    const json = await res.json();
    expect(json.products).toHaveLength(1);
    const p = json.products[0];
    expect(p).toMatchObject({
      product_id: 'p1',
      product_name: 'Butter Mochi',
      product_image_url: 'https://cdn.example/product-images/raw/mochi.jpg',
      business_logo_url: 'https://cdn.example/shop-logos/raw/logo.png',
      business_banner_url: 'https://cdn.example/shop-banners/raw/banner.jpg',
      price: 120,
      average_rating: 4.2,
      rating_count: 7,
      weekly_view_count: 12,
      distance_meters: null,
      is_new: false,
    });
  });

  it('surfaces an RPC error via the standard error shape', async () => {
    const { rpc } = buildSupabaseMock({ error: { message: 'boom' } });

    const res = await GET(makeRequest({ q: 'mochi' }));
    expect(res.status).toBe(500);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
