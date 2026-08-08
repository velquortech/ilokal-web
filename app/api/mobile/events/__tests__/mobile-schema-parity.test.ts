/**
 * Do the three mobile event endpoints actually satisfy the schema the mobile
 * app validates them with?
 *
 * The other suites assert individual keys. This one answers the whole question
 * the way the device does: it rebuilds `eventsResponseSchema` /
 * `eventDetailResponseSchema` from the mobile repo (`schemas/events.ts`) and
 * runs each route's REAL response through them.
 *
 * That is not a stylistic preference. Mobile calls `parseOrThrow`, which turns
 * a shape mismatch into a thrown `ApiError` — so a missing required-nullable
 * key does not degrade, it takes the screen down. And because `z.object()`
 * STRIPS unknown keys rather than rejecting them, the failure is asymmetric:
 * extra columns are silently swallowed (which is how the `select('*')` leak
 * went unnoticed), while a missing one is fatal. Only a real parse catches
 * both directions.
 *
 * The schema is duplicated here because the two repos cannot import from each
 * other. That is the justification CLAUDE.md §DRY asks for — and it is exactly
 * why this file exists rather than a comment promising the shapes agree.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/bearer', () => ({ createBearerClient: vi.fn() }));
vi.mock('@/lib/api/appSettings', () => ({ getEventsEnabled: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, bucket: string, path: string | null) =>
      path ? `https://cdn.example/${bucket}/${path}` : null,
  ),
}));

import { MOBILE_EVENT_SELECT } from '@/app/api/helpers/mobileEvent';
import { createBearerClient } from '@/supabase/bearer';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { GET as listGET } from '../route';
import { GET as detailGET } from '../../events/[id]/route';
import { GET as nearbyGET } from '../nearby/route';

// ─── The mobile contract, restated verbatim ──────────────────────────────────

const mobileEventWithRefsSchema = z.object({
  id: z.string(),
  business_id: z.string().nullable(),
  product_id: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  image_url: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  daily_start_time: z.string().nullable(),
  daily_end_time: z.string().nullable(),
  link_url: z.string().nullable(),
  ticket_url: z.string().nullable(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']),
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
  business: z
    .object({
      id: z.string(),
      shop_name: z.string(),
      logo_url: z.string().nullable(),
    })
    .nullable(),
  product: z
    .object({
      id: z.string(),
      name: z.string(),
      image_url: z.string().nullable(),
    })
    .nullable(),
  distance_meters: z.number().optional(),
});

/** `GET /mobile/events` — and, per mobile's own comment, the nearby shape too. */
const eventsResponseSchema = z.object({
  events: z.array(mobileEventWithRefsSchema),
  total: z.number(),
  has_more: z.boolean(),
});

/** `GET /mobile/events/:id`. */
const eventDetailResponseSchema = z.object({
  event: mobileEventWithRefsSchema,
});

// ─── A row exactly as PostgREST hands it back ────────────────────────────────

const EVENT_ID = 'a51e2eeb-b865-412e-ad7d-65e9f0335dd9';

const DB_ROW = {
  id: EVENT_ID,
  business_id: 'b1f2c3d4-0000-4000-8000-000000000001',
  product_id: null,
  name: 'Dinagyang Nights',
  description: null,
  address: 'Iloilo River Esplanade',
  latitude: 10.6973,
  longitude: 122.5649,
  image_url: 'biz-1/banner.webp',
  starts_at: '2036-01-24T10:00:00.000Z',
  ends_at: '2036-01-26T14:00:00.000Z',
  daily_start_time: null,
  daily_end_time: null,
  link_url: null,
  ticket_url: null,
  status: 'approved',
  created_at: '2035-12-01T00:00:00.000Z',
  updated_at: '2035-12-01T00:00:00.000Z',
  archived_at: null,
  // To-one embeds arrive as ARRAYS — the shape the normaliser has to survive.
  business: [
    {
      id: 'b1f2c3d4-0000-4000-8000-000000000001',
      shop_name: 'Roastery',
      logo_url: 'biz-1/logo.jpg',
    },
  ],
  product: null,
};

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

/** The list route's chain: .select().eq().is().gte().order().order().range() */
function mockList(rows: Record<string, unknown>[], count: number) {
  const q: Record<string, unknown> = {};
  for (const method of ['eq', 'is', 'gte', 'lt', 'or', 'order']) {
    q[method] = vi.fn(() => q);
  }
  q.range = vi.fn(async () => ({ data: rows, error: null, count }));
  vi.mocked(createBearerClient).mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => q) })),
  } as unknown as ReturnType<typeof createBearerClient>);
}

/** The detail route's chain: .select().eq().eq().is().maybeSingle() */
function mockDetail(row: Record<string, unknown> | null) {
  const q: Record<string, unknown> = {};
  for (const method of ['eq', 'is']) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  vi.mocked(createBearerClient).mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => q) })),
  } as unknown as ReturnType<typeof createBearerClient>);
}

/** Nearby: the ranking RPC, then the hydrate by id. */
function mockNearby(
  ranked: { id: string; distance_meters: number }[],
  rows: Record<string, unknown>[],
  count: number,
) {
  const hydrate: Record<string, unknown> = {};
  hydrate.in = vi.fn(() => hydrate);
  hydrate.eq = vi.fn(() => hydrate);
  hydrate.is = vi.fn(async () => ({ data: rows, error: null }));

  vi.mocked(createBearerClient).mockReturnValue({
    rpc: vi.fn(() => ({
      range: vi.fn(async () => ({ data: ranked, error: null, count })),
    })),
    from: vi.fn(() => ({ select: vi.fn(() => hydrate) })),
  } as unknown as ReturnType<typeof createBearerClient>);
}

describe('the fixture matches what the routes actually select', () => {
  it('supplies exactly the scalar columns MOBILE_EVENT_SELECT projects', () => {
    // Without this, `DB_ROW` is a hand-written object independent of the
    // projection — so deleting a column from the select would still parse
    // green HERE, and this suite's "runs the real response" claim would be
    // weaker than it reads. Tying the two together is what makes a green run
    // mean something.
    const projectedScalars = MOBILE_EVENT_SELECT.split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter((line) => line.length > 0 && !line.includes('('));
    const fixtureScalars = Object.keys(DB_ROW).filter(
      (key) => key !== 'business' && key !== 'product',
    );

    expect(fixtureScalars.sort()).toEqual([...projectedScalars].sort());
  });
});

describe('GET /api/mobile/events satisfies eventsResponseSchema', () => {
  it('parses a populated page', async () => {
    mockList([DB_ROW], 1);
    const body = await (await listGET(request('?when=upcoming'))).json();

    const parsed = eventsResponseSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it('parses the kill-switch payload, so a dark feature renders empty not broken', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);
    const body = await (await listGET(request('?when=upcoming'))).json();

    // Events are dark on cloud today (flag false + migrations unapplied), so
    // this is the payload mobile actually receives right now.
    expect(eventsResponseSchema.safeParse(body).success).toBe(true);
  });
});

describe('GET /api/mobile/events/:id satisfies eventDetailResponseSchema', () => {
  it('parses a found event', async () => {
    mockDetail(DB_ROW);
    const body = await (
      await detailGET(request(`/${EVENT_ID}`), {
        params: Promise.resolve({ id: EVENT_ID }),
      })
    ).json();

    const parsed = eventDetailResponseSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });
});

describe('GET /api/mobile/events/nearby satisfies eventsResponseSchema', () => {
  it('parses a populated page — the case the flat RPC row used to fail', async () => {
    mockNearby([{ id: EVENT_ID, distance_meters: 412.5 }], [DB_ROW], 1);
    const body = await (
      await nearbyGET(request('/nearby?lat=10.7&lng=122.6'))
    ).json();

    const parsed = eventsResponseSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
    expect(body.events[0].distance_meters).toBe(412.5);
  });

  it('would have FAILED on the old flat RPC row — proving the schema is a real gate', () => {
    // The 12 columns `events_nearby` actually returns. Kept here so the
    // regression this fix closes stays legible: without the hydrate, this is
    // what mobile was handed.
    const flatRpcRow = {
      id: EVENT_ID,
      name: 'Dinagyang Nights',
      description: null,
      address: 'Iloilo River Esplanade',
      image_url: 'biz-1/banner.webp',
      starts_at: '2036-01-24T10:00:00.000Z',
      ends_at: '2036-01-26T14:00:00.000Z',
      daily_start_time: null,
      daily_end_time: null,
      distance_meters: 412.5,
      business_id: 'b1f2c3d4-0000-4000-8000-000000000001',
      business_name: 'Roastery',
    };

    const parsed = eventsResponseSchema.safeParse({
      events: [flatRpcRow],
      total: 1,
      has_more: false,
    });

    expect(parsed.success).toBe(false);
    // Nullable is NOT optional — every one of these was a hard parse failure.
    const missing = parsed.error?.issues.map((issue) => issue.path.at(-1));
    expect(missing).toEqual(
      expect.arrayContaining([
        'product_id',
        'latitude',
        'longitude',
        'link_url',
        'ticket_url',
        'status',
        'created_at',
        'updated_at',
        'archived_at',
        'business',
        'product',
      ]),
    );
  });

  it('parses an empty feed', async () => {
    mockNearby([], [], 0);
    const body = await (
      await nearbyGET(request('/nearby?lat=10.7&lng=122.6'))
    ).json();

    expect(eventsResponseSchema.safeParse(body).success).toBe(true);
  });
});
