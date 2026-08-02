/**
 * GET /api/mobile/events/nearby
 *
 * The pull half of "events near me". Claims under test: the kill switch is
 * honoured HERE and not only in the UI, coordinates are validated before the
 * DB is touched, pagination goes through `.range()` rather than slicing in
 * Node (the PostgREST cap is 1000 rows), and stored image paths are resolved —
 * seeds hold full URLs while real uploads hold raw paths, so returning the raw
 * value ships a broken image.
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

function mockClient(result: RpcResult) {
  const range = vi.fn(async (_from: number, _to: number) => result);
  const rpc = vi.fn(
    (_fn: string, _args: Record<string, unknown>, _opts?: unknown) => ({
      range,
    }),
  );
  vi.mocked(createBearerClient).mockReturnValue({
    rpc,
  } as unknown as ReturnType<typeof createBearerClient>);
  return { rpc, range };
}

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events/nearby?${query}`);
}

const ROW = {
  id: 'evt-1',
  name: 'Night market',
  address: 'Iznart St',
  image_url: 'biz-1/market.webp',
  starts_at: '2036-08-20T02:00:00.000Z',
  ends_at: '2036-08-20T14:00:00.000Z',
  distance_meters: 412.5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

describe('the kill switch', () => {
  it('returns an empty feed without touching the DB when events are off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);
    const { rpc } = mockClient({ data: [ROW], error: null, count: 1 });

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

describe('the query', () => {
  it('calls the RPC with the point and a default radius', async () => {
    const { rpc } = mockClient({ data: [ROW], error: null, count: 1 });

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
    const { range } = mockClient({ data: [ROW], error: null, count: 42 });

    await GET(request('lat=10.7&lng=122.6&page=3&per_page=10'));

    // Slicing after the fetch would silently truncate at the 1000-row cap.
    expect(range).toHaveBeenCalledWith(20, 29);
  });

  it('caps per_page so a client cannot ask for everything', async () => {
    const { range } = mockClient({ data: [], error: null, count: 0 });

    await GET(request('lat=10.7&lng=122.6&per_page=500'));

    expect(range).toHaveBeenCalledWith(0, 49);
  });
});

describe('the response', () => {
  it('resolves the image path and reports has_more', async () => {
    mockClient({ data: [ROW], error: null, count: 42 });

    const res = await GET(request('lat=10.7&lng=122.6&per_page=1'));
    const body = await res.json();

    expect(body.events[0].image_url).toBe(
      'https://cdn.example/event-images/biz-1/market.webp',
    );
    expect(body.total).toBe(42);
    expect(body.has_more).toBe(true);
  });

  it('reports has_more false on the last page', async () => {
    mockClient({ data: [ROW], error: null, count: 1 });

    const res = await GET(request('lat=10.7&lng=122.6'));
    const body = await res.json();

    expect(body.has_more).toBe(false);
  });

  it('does not leak the driver message on a DB error', async () => {
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
