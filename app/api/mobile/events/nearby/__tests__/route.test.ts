/**
 * GET /api/mobile/events/nearby
 *
 * The pull half of "events near me". Claims under test: the kill switch is
 * honoured HERE and not only in the UI, coordinates are validated before the DB
 * is touched, pagination goes through `.range()` rather than slicing in Node
 * (the PostgREST cap is 1000 rows), and — the reason this route has two
 * queries — the response carries the full `MobileEventWithRefs` shape rather
 * than the RPC's flat row, in the RPC's distance order.
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

type RpcResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
  count: number | null;
};

type RowsResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

/**
 * The route drives two reads: the ranking RPC (`.range()`d) and the hydrate
 * (`.in().eq().is()`), so both are mocked and both are returned for assertion.
 */
function mockClient(
  rpcResult: RpcResult,
  rowsResult: RowsResult = {
    data: [],
    error: null,
  },
) {
  const range = vi.fn(async (_from: number, _to: number) => rpcResult);
  const rpc = vi.fn(
    (_fn: string, _args: Record<string, unknown>, _opts?: unknown) => ({
      range,
    }),
  );

  const rows = {
    in: vi.fn(() => rows),
    eq: vi.fn(() => rows),
    is: vi.fn(async () => rowsResult),
  };
  // The projection argument is typed, so the assertion below can read it —
  // an argless `vi.fn()` makes `mock.calls[0][0]` a type error on an empty
  // tuple, which is invisible until `tsc` runs (Next 16's build does not
  // typecheck).
  const select = vi.fn((_projection: string) => rows);
  const from = vi.fn(() => ({ select }));

  vi.mocked(createBearerClient).mockReturnValue({
    rpc,
    from,
  } as unknown as ReturnType<typeof createBearerClient>);

  return { rpc, range, select, rows, from };
}

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events/nearby?${query}`);
}

/** What the RPC ranks: an id and a distance, nothing more. */
const RANKED = { id: 'evt-1', distance_meters: 412.5 };

/** What the hydrate returns: the full mobile shape. */
const FULL_ROW = {
  id: 'evt-1',
  business_id: 'biz-1',
  product_id: null,
  name: 'Night market',
  description: null,
  address: 'Iznart St',
  latitude: 10.6973,
  longitude: 122.5649,
  image_url: 'biz-1/market.webp',
  starts_at: '2036-08-20T02:00:00.000Z',
  ends_at: '2036-08-20T14:00:00.000Z',
  daily_start_time: null,
  daily_end_time: null,
  link_url: null,
  ticket_url: null,
  status: 'approved',
  created_at: '2036-01-01T00:00:00.000Z',
  updated_at: '2036-01-01T00:00:00.000Z',
  archived_at: null,
  business: [
    { id: 'biz-1', shop_name: 'Roastery', logo_url: 'biz-1/logo.jpg' },
  ],
  product: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

describe('the kill switch', () => {
  it('returns an empty feed without touching the DB when events are off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);
    const { rpc } = mockClient({ data: [RANKED], error: null, count: 1 });

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.events).toEqual([]);
    expect(body.has_more).toBe(false);
    // An endpoint that keeps serving while the feature is "off" is not off.
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('coordinates', () => {
  it.each([
    ['no params', ''],
    ['lat only', 'lat=10.7'],
    ['lng only', 'lng=122.6'],
    ['non-numeric', 'lat=here&lng=there'],
  ])('rejects %s', async (_label, query) => {
    const { rpc } = mockClient({ data: [], error: null, count: 0 });

    const res = await GET(request(query));

    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['latitude off the globe', 'lat=100&lng=0'],
    ['longitude off the globe', 'lat=0&lng=200'],
  ])('rejects %s', async (_label, query) => {
    const { rpc } = mockClient({ data: [], error: null, count: 0 });

    const res = await GET(request(query));

    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('the ranking query', () => {
  it('calls the RPC with the point and a default radius', async () => {
    const { rpc } = mockClient(
      { data: [RANKED], error: null, count: 1 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    await GET(request('lat=10.6973&lng=122.5649'));

    expect(rpc).toHaveBeenCalledWith(
      'events_nearby',
      { lat: 10.6973, lng: 122.5649, radius_meters: 20_000 },
      { count: 'exact' },
    );
  });

  it('clamps an absurd radius rather than passing it through', async () => {
    const { rpc } = mockClient({ data: [], error: null, count: 0 });

    await GET(request('lat=10.7&lng=122.6&radius=99999999'));

    expect(rpc.mock.calls[0][1]).toMatchObject({ radius_meters: 100_000 });
  });

  it('paginates in the DB, not in Node', async () => {
    const { range } = mockClient(
      { data: [RANKED], error: null, count: 42 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    await GET(request('lat=10.7&lng=122.6&page=3&per_page=10'));

    // Slicing after the fetch would silently truncate at the 1000-row cap.
    expect(range).toHaveBeenCalledWith(20, 29);
  });

  it('caps per_page so a client cannot ask for everything', async () => {
    const { range } = mockClient({ data: [], error: null, count: 0 });

    await GET(request('lat=10.7&lng=122.6&per_page=500'));

    expect(range).toHaveBeenCalledWith(0, 49);
  });

  it('skips the hydrate entirely when nothing is in range', async () => {
    const { from } = mockClient({ data: [], error: null, count: 0 });

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(body.events).toEqual([]);
    // A second round trip for an empty id list is a wasted query.
    expect(from).not.toHaveBeenCalled();
  });
});

describe('the hydrate', () => {
  it('reads the ranked ids through the shared mobile projection', async () => {
    const { select, rows } = mockClient(
      {
        data: [RANKED, { id: 'evt-2', distance_meters: 900 }],
        error: null,
        count: 2,
      },
      { data: [FULL_ROW], error: null },
    );

    await GET(request('lat=10.7&lng=122.6'));

    // The projection is the contract — never `*`, which would ship review
    // notes and an admin id to an anonymous device.
    const projection = select.mock.calls[0][0];
    expect(projection).not.toContain('review_note');
    expect(projection).toContain('business:businesses');
    expect(rows.in).toHaveBeenCalledWith('id', ['evt-1', 'evt-2']);
  });

  it('restates the visibility gate instead of leaning on RLS alone', async () => {
    const { rows } = mockClient(
      { data: [RANKED], error: null, count: 1 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    await GET(request('lat=10.7&lng=122.6'));

    expect(rows.eq).toHaveBeenCalledWith('status', 'approved');
    expect(rows.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('does not leak the driver message when the hydrate fails', async () => {
    mockClient(
      { data: [RANKED], error: null, count: 1 },
      {
        data: null,
        error: { message: 'relation "events" does not exist' },
      },
    );

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('relation');
  });
});

describe('the response', () => {
  it('returns the full mobile event shape, not the RPC row', async () => {
    mockClient(
      { data: [RANKED], error: null, count: 1 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();
    const event = body.events[0];

    // These nine keys are required-nullable in the mobile schema and absent
    // from the RPC — returning the flat row failed `parseOrThrow` outright.
    for (const key of [
      'product_id',
      'latitude',
      'longitude',
      'link_url',
      'ticket_url',
      'status',
      'created_at',
      'updated_at',
      'archived_at',
    ]) {
      expect(event).toHaveProperty(key);
    }

    // `business` is an OBJECT here, where the RPC offered a `business_name`
    // string; `product` must be present as null rather than missing.
    expect(event.business).toMatchObject({
      id: 'biz-1',
      shop_name: 'Roastery',
    });
    expect(event.product).toBeNull();
    expect(event).not.toHaveProperty('business_name');
  });

  it('resolves every stored image path, including the embedded logo', async () => {
    mockClient(
      { data: [RANKED], error: null, count: 42 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    const res = await GET(request('lat=10.7&lng=122.6&per_page=1'));
    const body = await res.json();

    expect(body.events[0].image_url).toBe(
      'https://cdn.example/event-images/biz-1/market.webp',
    );
    // The flat RPC row had no logo to resolve at all.
    expect(body.events[0].business.logo_url).toBe(
      'https://cdn.example/shop-logos/biz-1/logo.jpg',
    );
    expect(body.total).toBe(42);
    expect(body.has_more).toBe(true);
  });

  it('keeps the distance and the RPC ordering the hydrate cannot preserve', async () => {
    const near = { id: 'evt-near', distance_meters: 100 };
    const far = { id: 'evt-far', distance_meters: 5000 };
    mockClient(
      { data: [near, far], error: null, count: 2 },
      {
        // `.in()` answers in arbitrary order — here, deliberately reversed.
        data: [
          { ...FULL_ROW, id: 'evt-far' },
          { ...FULL_ROW, id: 'evt-near' },
        ],
        error: null,
      },
    );

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(body.events.map((e: { id: string }) => e.id)).toEqual([
      'evt-near',
      'evt-far',
    ]);
    expect(body.events[0].distance_meters).toBe(100);
    expect(body.events[1].distance_meters).toBe(5000);
  });

  it('drops a row archived between the two reads rather than emitting a partial one', async () => {
    mockClient(
      {
        data: [RANKED, { id: 'evt-gone', distance_meters: 800 }],
        error: null,
        count: 2,
      },
      // The hydrate returns only one of the two ranked ids.
      { data: [FULL_ROW], error: null },
    );

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    // A half-populated row would fail the client's parse and take the whole
    // page down; one fewer complete row does not.
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe('evt-1');
    // has_more still follows what the RPC RANKED, so a dropped row cannot look
    // like the end of the feed.
    expect(body.has_more).toBe(false);
    expect(body.total).toBe(2);
  });

  it('reports has_more false on the last page', async () => {
    mockClient(
      { data: [RANKED], error: null, count: 1 },
      {
        data: [FULL_ROW],
        error: null,
      },
    );

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(body.has_more).toBe(false);
  });

  it('does not leak the driver message on an RPC error', async () => {
    mockClient({
      data: null,
      error: { message: 'relation "events" does not exist' },
      count: null,
    });

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('relation');
  });
});
