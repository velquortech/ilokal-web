/**
 * GET /api/mobile/events/nearby
 *
 * The location-ranked counterpart to the events list. Claims under test: the
 * `when` filter is validated and narrows the hydrated page (gte/lt on
 * `ends_at`), the default `all` skips the time filter, distance order is
 * preserved after hydration, `distance_meters` is emitted, and pagination
 * advances by the RPC page (not the emitted rows).
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

type RankedRow = { id: string; distance_meters: number };

function mockNearby({
  ranked,
  rows,
  count,
}: {
  ranked: RankedRow[];
  rows: Record<string, unknown>[];
  count: number;
}) {
  // The hydration chain is awaited directly (no `.range()` at the end), so the
  // chain object itself must be thenable — like real supabase-js.
  const hydrate = {
    then: (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: rows, error: null }),
    in: vi.fn(() => hydrate),
    eq: vi.fn(() => hydrate),
    is: vi.fn(() => hydrate),
    gte: vi.fn(() => hydrate),
    lt: vi.fn(() => hydrate),
  };
  const select = vi.fn(() => hydrate);
  const range = vi.fn(async () => ({
    data: ranked,
    count,
    error: null,
  }));
  vi.mocked(createBearerClient).mockReturnValue({
    rpc: vi.fn(() => ({ range })),
    from: vi.fn(() => ({ select })),
  } as unknown as ReturnType<typeof createBearerClient>);
  return { hydrate, select, range };
}

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events/nearby?${query}`);
}

function row(id: string): Record<string, unknown> {
  return {
    id,
    name: `Event ${id}`,
    starts_at: '2026-08-15T10:00:00+08:00',
    ends_at: '2026-08-17T22:00:00+08:00',
  };
}

beforeEach(() => {
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

describe('GET /api/mobile/events/nearby — when filter', () => {
  it('validates `when` before touching the DB', async () => {
    const { range } = mockNearby({ ranked: [], rows: [], count: 0 });
    const res = await GET(request('lat=10.72&lng=122.56&when=bogus'));
    expect(res.status).toBe(400);
    expect(range).not.toHaveBeenCalled();
  });

  it('defaults to `all` — no time-window filter on hydration', async () => {
    const { hydrate } = mockNearby({
      ranked: [{ id: 'e1', distance_meters: 300 }],
      rows: [row('e1')],
      count: 1,
    });
    const res = await GET(request('lat=10.72&lng=122.56'));
    expect(res.status).toBe(200);
    expect(hydrate.gte).not.toHaveBeenCalled();
    expect(hydrate.lt).not.toHaveBeenCalled();
  });

  it('narrows the hydrated page to upcoming (ends_at >= now, "on right now" semantics)', async () => {
    const { hydrate } = mockNearby({
      ranked: [{ id: 'e1', distance_meters: 300 }],
      rows: [row('e1')],
      count: 1,
    });
    const res = await GET(request('lat=10.72&lng=122.56&when=upcoming'));
    expect(res.status).toBe(200);
    expect(hydrate.gte).toHaveBeenCalledWith('ends_at', expect.any(String));
    expect(hydrate.lt).not.toHaveBeenCalled();
  });

  it('narrows the hydrated page to past (ends_at < now)', async () => {
    const { hydrate } = mockNearby({
      ranked: [{ id: 'e1', distance_meters: 300 }],
      rows: [row('e1')],
      count: 1,
    });
    const res = await GET(request('lat=10.72&lng=122.56&when=past'));
    expect(res.status).toBe(200);
    expect(hydrate.lt).toHaveBeenCalledWith('ends_at', expect.any(String));
    expect(hydrate.gte).not.toHaveBeenCalled();
  });
});

describe('GET /api/mobile/events/nearby — distance ranking + pagination', () => {
  it('emits distance_meters and preserves the RPC rank order after hydration', async () => {
    const ranked: RankedRow[] = [
      { id: 'far', distance_meters: 12_000 },
      { id: 'near', distance_meters: 200 },
    ];
    mockNearby({ ranked, rows: [row('near'), row('far')], count: 2 });
    const res = await GET(request('lat=10.72&lng=122.56&per_page=10'));
    const body = await res.json();
    // Hydration answers in arbitrary order; the RPC sequence must drive output.
    expect(body.events.map((e: { id: string }) => e.id)).toEqual([
      'far',
      'near',
    ]);
    expect(body.events[0].distance_meters).toBe(12_000);
    expect(body.events[1].distance_meters).toBe(200);
    expect(body.total).toBe(2);
    expect(body.has_more).toBe(false);
  });

  it('computes has_more from the RPC page, not the emitted rows', async () => {
    mockNearby({
      ranked: [{ id: 'e1', distance_meters: 300 }],
      rows: [row('e1')],
      count: 5,
    });
    const res = await GET(request('lat=10.72&lng=122.56&per_page=1'));
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    // One row on a page of one, but 4 more ranked rows exist in the radius.
    expect(body.has_more).toBe(true);
    expect(body.total).toBe(5);
  });

  it('returns an empty payload when the feature flag is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);
    const res = await GET(request('lat=10.72&lng=122.56'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ events: [], total: 0, has_more: false });
  });

  it('rejects missing or out-of-range coordinates', async () => {
    expect((await GET(request('lng=122.56'))).status).toBe(400);
    expect((await GET(request('lat=10.72&lng=999'))).status).toBe(400);
  });
});
