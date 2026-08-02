/**
 * Event reads.
 *
 * These functions feed public pages, so the claim under test is that a failure
 * degrades rather than propagates: nothing throws, an outage is reported as
 * LOAD_FAILED and never confused with an empty result, and every list is
 * bounded by `.range()` — the PostgREST cap is 1000 rows, so an unbounded read
 * silently lies past it.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import {
  getPublicEvents,
  getBannerEvents,
  getEventById,
  getPendingReviewCount,
  getNearbyEvents,
} from '../eventQuery';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, bucket: string, path: string | null) =>
      !path
        ? null
        : path.startsWith('http')
          ? path
          : `https://cdn.example/${bucket}/${path}`,
  ),
}));

type Result = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

/**
 * A chainable stub: every builder method returns the same object, and the
 * terminal await resolves to `result`. Lets one helper serve query shapes that
 * differ only in which filters they apply.
 */
function chain(result: Result) {
  const calls: Record<string, unknown[][]> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return proxy;
    };

  const proxy: Record<string, unknown> = {
    select: record('select'),
    eq: record('eq'),
    is: record('is'),
    or: record('or'),
    ilike: record('ilike'),
    gte: record('gte'),
    lt: record('lt'),
    order: record('order'),
    limit: record('limit'),
    range: (...args: unknown[]) => {
      (calls.range ??= []).push(args);
      return Promise.resolve(result);
    },
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };

  return { proxy, calls };
}

function mockClient(result: Result, rpcResult?: Result) {
  const { proxy, calls } = chain(result);
  const from = vi.fn(() => proxy);
  const rpcChain = chain(rpcResult ?? result);
  const rpc = vi.fn(() => rpcChain.proxy);

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({
    from,
    rpc,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { from, calls, rpc, rpcCalls: rpcChain.calls };
}

beforeEach(() => vi.clearAllMocks());

describe('getPublicEvents', () => {
  it('bounds the read with .range() and reports the exact count', async () => {
    const { calls } = mockClient({ data: [], error: null, count: 37 });

    const result = await getPublicEvents({ page: 2, per_page: 12 });

    expect(calls.range[0]).toEqual([12, 23]);
    expect(result.metadata.total).toBe(37);
    expect(result.metadata.total_pages).toBe(4);
  });

  it('excludes archived rows', async () => {
    const { calls } = mockClient({ data: [], error: null, count: 0 });

    await getPublicEvents({});

    expect(calls.is).toContainEqual(['archived_at', null]);
  });

  it('shows what is still running under "upcoming"', async () => {
    const { calls } = mockClient({ data: [], error: null, count: 0 });

    await getPublicEvents({ when: 'upcoming' });

    // An event that started an hour ago is the most upcoming thing there is,
    // so the filter is on ends_at, not starts_at.
    expect(calls.gte[0][0]).toBe('ends_at');
  });

  it('orders past events newest first', async () => {
    const { calls } = mockClient({ data: [], error: null, count: 0 });

    await getPublicEvents({ when: 'past' });

    expect(calls.lt[0][0]).toBe('ends_at');
    expect(calls.order[0]).toEqual(['starts_at', { ascending: false }]);
  });

  it('always breaks ties by id, so pages cannot reshuffle', async () => {
    const { calls } = mockClient({ data: [], error: null, count: 0 });

    await getPublicEvents({});

    expect(calls.order).toContainEqual(['id', { ascending: true }]);
  });

  it('reports LOAD_FAILED rather than an empty list on a DB error', async () => {
    mockClient({ data: null, error: { message: 'boom' }, count: null });

    const result = await getPublicEvents({});

    // An outage must never render as "nothing is on".
    expect(result.error).toBe('LOAD_FAILED');
    expect(result.events).toEqual([]);
  });

  it('does not throw when the client itself blows up', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValue(
      new Error('no connection'),
    );

    const result = await getPublicEvents({});

    expect(result.error).toBe('LOAD_FAILED');
  });
});

describe('getBannerEvents', () => {
  it('asks only for what is still to come, best first', async () => {
    const { calls } = mockClient({ data: [], error: null });

    await getBannerEvents(8);

    expect(calls.gte[0][0]).toBe('ends_at');
    expect(calls.order[0]).toEqual(['priority', { ascending: false }]);
    expect(calls.limit[0]).toEqual([8]);
  });

  it('returns an empty banner on failure instead of throwing', async () => {
    mockClient({ data: null, error: { message: 'boom' } });

    expect(await getBannerEvents()).toEqual([]);
  });
});

describe('getEventById', () => {
  it('keeps NOT_FOUND and LOAD_FAILED distinct', async () => {
    mockClient({ data: null, error: null });
    // A missing row is a 404…
    expect(await getEventById('evt-missing')).toEqual({ error: 'NOT_FOUND' });

    vi.clearAllMocks();
    mockClient({ data: null, error: { message: 'boom' } });
    // …but a transient blip must not tell a crawler the page is gone.
    expect(await getEventById('evt-1')).toEqual({ error: 'LOAD_FAILED' });
  });

  it('short-circuits an empty id without a round trip', async () => {
    const { from } = mockClient({ data: null, error: null });

    expect(await getEventById('')).toEqual({ error: 'NOT_FOUND' });
    expect(from).not.toHaveBeenCalled();
  });

  it('normalises the array-shaped to-one embeds', async () => {
    // PostgREST returns a to-one embed as an ARRAY; reading `.shop_name` off
    // that yields undefined and renders as a shop with no name.
    mockClient({
      data: {
        id: 'evt-1',
        business: [{ id: 'biz-1', shop_name: 'Kape Iloilo', logo_url: null }],
        product: [],
      },
      error: null,
    });

    const result = await getEventById('evt-1');

    expect('event' in result && result.event.business?.shop_name).toBe(
      'Kape Iloilo',
    );
    expect('event' in result && result.event.product).toBeNull();
  });
});

describe('storage paths are resolved before rendering', () => {
  it('turns a raw upload path into a usable URL', async () => {
    // `uploadWebP` returns `data.path`, so a real upload stores
    // `<businessId>/<file>.webp`. Handed to next/image that is a RELATIVE url
    // and 404s — which is exactly how the banner rendered as a bare colour
    // block after the first event was created through the UI.
    mockClient({
      data: {
        id: 'evt-1',
        image_url: 'biz-1/1785649417885-poster.webp',
        business: [
          { id: 'biz-1', shop_name: 'Kape', logo_url: 'biz-1/l.webp' },
        ],
        product: [],
      },
      error: null,
    });

    const result = await getEventById('evt-1');

    expect('event' in result && result.event.image_url).toBe(
      'https://cdn.example/event-images/biz-1/1785649417885-poster.webp',
    );
    expect('event' in result && result.event.business?.logo_url).toBe(
      'https://cdn.example/shop-logos/biz-1/l.webp',
    );
  });

  it('leaves a full URL alone, so seeded rows still work', async () => {
    mockClient({
      data: {
        id: 'evt-1',
        image_url: 'https://picsum.photos/seed/x/1600/686',
        business: [],
        product: [],
      },
      error: null,
    });

    const result = await getEventById('evt-1');

    expect('event' in result && result.event.image_url).toBe(
      'https://picsum.photos/seed/x/1600/686',
    );
  });

  it('resolves the banner list too, not only the detail read', async () => {
    mockClient({
      data: [{ id: 'evt-1', image_url: 'biz-1/poster.webp' }],
      error: null,
    });

    const [event] = await getBannerEvents();

    expect(event.image_url).toBe(
      'https://cdn.example/event-images/biz-1/poster.webp',
    );
  });
});

describe('getPendingReviewCount', () => {
  it('counts without pulling any rows back', async () => {
    const { calls } = mockClient({ data: null, error: null, count: 4 });

    const count = await getPendingReviewCount();

    expect(count).toBe(4);
    // Repo count rule: a count-only read carries no payload.
    expect(calls.select[0]).toEqual(['id', { count: 'exact', head: true }]);
  });

  it('reports zero rather than throwing on failure', async () => {
    mockClient({ data: null, error: { message: 'boom' }, count: null });
    expect(await getPendingReviewCount()).toBe(0);
  });
});

describe('getNearbyEvents', () => {
  it('calls the RPC with the point and radius', async () => {
    const { rpc } = mockClient(
      { data: [], error: null },
      { data: [], error: null },
    );

    await getNearbyEvents(10.6973, 122.5649, 5000);

    expect(rpc).toHaveBeenCalledWith('events_nearby', {
      lat: 10.6973,
      lng: 122.5649,
      radius_meters: 5000,
    });
  });

  it('degrades to an empty list on failure', async () => {
    mockClient(
      { data: null, error: null },
      { data: null, error: { message: 'x' } },
    );

    const result = await getNearbyEvents(10.7, 122.6);

    expect(result.error).toBe('LOAD_FAILED');
    expect(result.events).toEqual([]);
  });
});
