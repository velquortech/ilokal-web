/**
 * GET /api/mobile/events
 *
 * The non-location counterpart to `events/nearby`. Claims under test: the kill
 * switch is honoured here too, the `when` filter is validated before the DB is
 * touched, pagination goes through `.range()` with an exact count, and stored
 * image paths (plus to-one embeds) are resolved — seeds hold full URLs while
 * real uploads hold raw paths, so returning the raw value ships a broken image.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/bearer', () => ({ createBearerClient: vi.fn() }));
vi.mock('@/lib/api/appSettings', () => ({ getEventsEnabled: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, bucket: string, path: string | null) =>
      path ? `https://cdn.example/${bucket}/${path}` : null,
  ),
}));

import { createBearerClient } from '@/supabase/bearer';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { GET } from '../route';

type SelectResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
  count: number | null;
};

/** Builds the chainable query mock the route drives (.eq/.is/.gte/.lt/.or/.order/.range). */
function mockQuery(result: SelectResult) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async (_from: number, _to: number) => result),
  };
  const select = vi.fn(() => query);
  vi.mocked(createBearerClient).mockReturnValue({
    from: vi.fn(() => ({ select })),
  } as unknown as ReturnType<typeof createBearerClient>);
  return { select, query };
}

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events?${query}`);
}

beforeEach(() => {
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

describe('GET /api/mobile/events', () => {
  it('returns an empty payload when the feature flag is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);

    const res = await GET(request('when=upcoming'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ events: [], total: 0, has_more: false });
  });

  it('rejects an invalid `when` value', async () => {
    const res = await GET(request('when=archived'));
    expect(res.status).toBe(400);
  });

  it('filters by `when` and resolves images + embeds', async () => {
    mockQuery({
      data: [
        {
          id: 'event-1',
          name: 'Dinagyang Nights',
          address: 'Iloilo River Esplanade',
          image_url: 'raw/path/banner.jpg',
          status: 'approved',
          business: [
            { id: 'biz-1', shop_name: 'The Artisan Roastery', logo_url: 'raw/logo.jpg' },
          ],
          product: null,
        },
      ],
      error: null,
      count: 1,
    });

    const res = await GET(request('when=upcoming&page=1&per_page=10'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.has_more).toBe(false);
    expect(body.events[0].image_url).toBe(
      'https://cdn.example/event-images/raw/path/banner.jpg',
    );
    expect(body.events[0].business.logo_url).toBe(
      'https://cdn.example/shop-logos/raw/logo.jpg',
    );
    // The to-one embed is normalised out of its array wrapper.
    expect(body.events[0].business.shop_name).toBe('The Artisan Roastery');
  });

  it('paginates through .range() with an exact count', async () => {
    const { query } = mockQuery({
      data: [{ id: 'event-1' }, { id: 'event-2' }, { id: 'event-3' }],
      error: null,
      count: 7,
    });

    const res = await GET(request('when=all&page=2&per_page=3'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.has_more).toBe(true);
    expect(query.range).toHaveBeenCalledWith(3, 5);
  });

  it('returns a generic 500 on a DB error', async () => {
    mockQuery({ data: null, error: { message: 'boom' }, count: null });
    const res = await GET(request('when=upcoming'));
    expect(res.status).toBe(500);
  });
});
