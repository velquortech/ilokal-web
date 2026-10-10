/**
 * Date-planner plans API.
 * Covers GET/POST /api/protected/mobile/plans and GET/PUT/DELETE
 * /api/protected/mobile/plans/:planId: ownership (non-owners 404, never 403),
 * validation before any write (a bad business_id rejects the whole PUT without
 * touching plan_stops), the "stops array order IS position" replace-all model,
 * and the detail loader's get_business_public_info join for operating_hours.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { GET as listGET, POST as createPOST } from '../route';
import { GET as detailGET, PUT, DELETE } from '../[planId]/route';

const PLAN_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const OWNER_ID = 'cccccccc-0000-0000-0000-000000000001';
const BIZ_A = 'b0000000-0000-0000-0000-000000000101';
const BIZ_B = 'b0000000-0000-0000-0000-000000000102';

const mockGetUser = vi.mocked(getMobileUser);

type Builder = Record<string, unknown>;

function json(body: unknown) {
  return { json: async () => body } as unknown as NextRequest;
}

function pathParams(planId: string) {
  return { params: Promise.resolve({ planId }) };
}

/**
 * A chainable Supabase builder whose awaiting terminals
 * (`.single()`, `.maybeSingle()`, or an awaited chain) consume a FIFO script.
 * The order the routes hit terminals is deterministic, so each table gets its
 * results in call order — no shared-builder ambiguity between, say, the PUT
 * ownership check and the trailing loadPlanDetail.
 */
function chainScript(results: unknown[]): Builder {
  const queue = [...results];
  const next = () => queue.shift();
  const b: Builder = {};
  b.select = vi.fn(() => b);
  b.insert = vi.fn(() => b);
  b.update = vi.fn(() => b);
  b.delete = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.order = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(next()));
  b.maybeSingle = vi.fn(() => Promise.resolve(next()));
  b.then = (resolve: (value: unknown) => unknown) => resolve(next());
  return b;
}

type TableScripts = {
  plans?: unknown[];
  plan_stops?: unknown[];
  businesses?: unknown[];
  /** Keyed by RPC name so one call site's script can't consume another's. */
  rpc?: Record<string, unknown[]>;
};

function makeAuth(tableScripts: TableScripts = {}) {
  const tables: Record<string, Builder> = {
    plans: chainScript(tableScripts.plans ?? [{ data: [], error: null }]),
    plan_stops: chainScript(
      tableScripts.plan_stops ?? [{ data: null, error: null }],
    ),
    businesses: chainScript(
      tableScripts.businesses ?? [{ data: [], error: null }],
    ),
  };
  const rpcScripts = tableScripts.rpc ?? {};
  const rpcBuilders: Record<string, Builder> = {};
  const rpc = vi.fn((name: string) => {
    rpcBuilders[name] ??= chainScript(
      rpcScripts[name] ?? [{ data: null, error: null }],
    );
    return rpcBuilders[name];
  });
  const supabase = {
    from: vi.fn((table: string) => tables[table]),
    rpc,
  };
  mockGetUser.mockResolvedValue({
    user: { id: OWNER_ID },
    token: 'mock-token',
    supabase,
  });
  return { tables, rpc, rpcBuilders, supabase };
}

describe('GET /api/protected/mobile/plans', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await listGET(json(null));
    expect(res.status).toBe(401);
  });

  it('lists plans as summaries with a filtered, position-ordered preview', async () => {
    const { supabase } = makeAuth({
      plans: [
        {
          data: [
            {
              id: 'p1',
              title: 'Dinner',
              target_date: '2026-09-04',
              plan_stops: [
                { position: 1, businesses: { logo_url: '/b.jpg' } },
                { position: 0, businesses: { logo_url: '/a.jpg' } },
                { position: 2, businesses: null },
              ],
            },
            {
              id: 'p2',
              title: 'Empty',
              target_date: '2026-09-01',
              plan_stops: [],
            },
          ],
          error: null,
        },
      ],
    });

    const res = await listGET(json(null));
    expect(res.status).toBe(200);
    const body = await res.json();

    // A stop whose business is no longer publicly readable STILL counts —
    // dropping it made the list disagree with the detail screen. The preview is
    // the first stop by position that has a logo — /a.jpg, not /b.jpg.
    expect(body.plans).toEqual([
      {
        id: 'p1',
        title: 'Dinner',
        target_date: '2026-09-04',
        stop_count: 3,
        preview_logo_url: '/a.jpg',
      },
      {
        id: 'p2',
        title: 'Empty',
        target_date: '2026-09-01',
        stop_count: 0,
        preview_logo_url: null,
      },
    ]);

    // Ordered by creation for the client to split Upcoming/Past.
    const order = supabase.from.mock.results[0].value.order;
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns 500 when the list query fails', async () => {
    makeAuth({ plans: [{ data: null, error: new Error('boom') }] });
    const res = await listGET(json(null));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/protected/mobile/plans', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await createPOST(json({}));
    expect(res.status).toBe(401);
  });

  it('rejects a missing date before any insert', async () => {
    const { tables } = makeAuth();
    const res = await createPOST(json({ title: 'No date' }));
    expect(res.status).toBe(400);
    expect(tables.plans.insert).not.toHaveBeenCalled();
  });

  it('creates an empty plan owned by the caller', async () => {
    const { tables } = makeAuth({
      plans: [
        {
          data: {
            id: PLAN_ID,
            title: 'Movie night',
            target_date: '2026-10-02',
          },
          error: null,
        },
      ],
    });

    const res = await createPOST(
      json({ title: 'Movie night', target_date: '2026-10-02' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(tables.plans.insert).toHaveBeenCalledWith({
      user_id: OWNER_ID,
      title: 'Movie night',
      target_date: '2026-10-02',
    });
    // The create response matches the GET-detail shape so the client can hand
    // it straight to savePlan without a refetch.
    expect(body.plan).toEqual({
      id: PLAN_ID,
      title: 'Movie night',
      target_date: '2026-10-02',
      stops: [],
    });
  });
});

describe('GET /api/protected/mobile/plans/:planId', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await detailGET(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(401);
  });

  // A non-owner 404s — never 403, never confirming the row exists.
  it('404s a plan belonging to another user', async () => {
    makeAuth({ plans: [{ data: null, error: null }] });
    const res = await detailGET(json(null), pathParams('other-owner-plan'));
    expect(res.status).toBe(404);
  });

  it('returns the plan with stops enriched by public hours in one round trip', async () => {
    const { supabase } = makeAuth({
      plans: [
        {
          data: {
            id: PLAN_ID,
            title: 'Trip',
            target_date: '2026-11-11',
            plan_stops: [
              {
                id: 's1',
                stop_time: '18:30:00',
                position: 0,
                businesses: {
                  id: BIZ_A,
                  shop_name: 'Cafe',
                  logo_url: '/c.jpg',
                },
              },
            ],
          },
          error: null,
        },
      ],
      rpc: {
        get_business_public_info: [
          { data: { operating_hours: { monday: '09:00-17:00' } }, error: null },
        ],
      },
    });

    const res = await detailGET(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(supabase.rpc).toHaveBeenCalledWith('get_business_public_info', {
      p_business_id: BIZ_A,
    });
    expect(body.plan).toEqual({
      id: PLAN_ID,
      title: 'Trip',
      target_date: '2026-11-11',
      stops: [
        {
          id: 's1',
          // Postgres "HH:mm:ss" normalised back to the client's "HH:mm".
          stop_time: '18:30',
          position: 0,
          business: {
            id: BIZ_A,
            shop_name: 'Cafe',
            logo_url: '/c.jpg',
            operating_hours: { monday: '09:00-17:00' },
          },
        },
      ],
    });
  });

  it('carries null operating_hours for an unverified/archived business', async () => {
    makeAuth({
      plans: [
        {
          data: {
            id: PLAN_ID,
            title: 'Trip',
            target_date: '2026-11-11',
            plan_stops: [
              {
                id: 's1',
                stop_time: null,
                position: 0,
                businesses: { id: 'b9', shop_name: 'Empty', logo_url: null },
              },
            ],
          },
          error: null,
        },
      ],
      // get_business_public_info returns no row for unverified/archived
      // businesses — null hours, "unknown", not "closed".
      rpc: { get_business_public_info: [{ data: null, error: null }] },
    });

    const res = await detailGET(json(null), pathParams(PLAN_ID));
    const body = await res.json();
    expect(body.plan.stops[0].stop_time).toBeNull();
    expect(body.plan.stops[0].business.operating_hours).toBeNull();
  });

  it('keeps a stop whose business is no longer readable, as business: null', async () => {
    // `businesses` RLS gates on status = 'verified' AND archived_at IS NULL, so
    // a shop that loses verification embeds as null. Dropping the stop here was
    // silent data loss: the client re-sent the shortened list on its next
    // reorder and the row was deleted for good. Keep it, flagged.
    makeAuth({
      plans: [
        {
          data: {
            id: PLAN_ID,
            title: 'Trip',
            target_date: '2026-11-11',
            plan_stops: [
              {
                id: 's1',
                stop_time: '18:00:00',
                position: 0,
                businesses: null,
              },
              {
                id: 's2',
                stop_time: null,
                position: 1,
                businesses: { id: BIZ_A, shop_name: 'Cafe', logo_url: null },
              },
            ],
          },
          error: null,
        },
      ],
      rpc: { get_business_public_info: [{ data: null, error: null }] },
    });

    const res = await detailGET(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.plan.stops).toHaveLength(2);
    expect(body.plan.stops[0].id).toBe('s1');
    expect(body.plan.stops[0].business).toBeNull();
    // Its own data survives, so the client can round-trip it unchanged.
    expect(body.plan.stops[0].stop_time).toBe('18:00');
    expect(body.plan.stops[0].position).toBe(0);
    expect(body.plan.stops[1].business.shop_name).toBe('Cafe');
  });
});

describe('PUT /api/protected/mobile/plans/:planId', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await PUT(json({}), pathParams(PLAN_ID));
    expect(res.status).toBe(401);
  });

  it('404s a plan owned by someone else, before touching any stop rows', async () => {
    const { tables } = makeAuth({ plans: [{ data: null, error: null }] });
    const res = await PUT(
      json({ title: 'X', target_date: '2026-10-02', stops: [] }),
      pathParams(PLAN_ID),
    );
    expect(res.status).toBe(404);
    expect(tables.plan_stops.delete).not.toHaveBeenCalled();
  });

  it('rejects an invalid stops array before any write', async () => {
    const { tables } = makeAuth({
      plans: [{ data: { id: PLAN_ID }, error: null }],
    });
    const res = await PUT(
      json({
        title: 'X',
        target_date: '2026-10-02',
        // Non-guid business_id fails z.guid().
        stops: [{ business_id: 'not-a-guid', stop_time: null }],
      }),
      pathParams(PLAN_ID),
    );
    expect(res.status).toBe(400);
    expect(tables.plans.update).not.toHaveBeenCalled();
    expect(tables.plan_stops.delete).not.toHaveBeenCalled();
  });

  it('maps a foreign-key violation to 400, writing nothing', async () => {
    // Existence is the foreign key's job now, not a pre-flight SELECT: the old
    // pre-check read `businesses`, which RLS hides once a shop loses
    // verification, so a still-valid stop looked nonexistent and 400'd the save.
    const { rpcBuilders, tables } = makeAuth({
      rpc: {
        replace_plan_stops: [
          { data: null, error: { code: '23503', message: 'fk violation' } },
        ],
      },
    });
    const res = await PUT(
      json({
        title: 'X',
        target_date: '2026-10-02',
        stops: [
          { business_id: BIZ_A, stop_time: null },
          { business_id: BIZ_B, stop_time: '14:00' },
        ],
      }),
      pathParams(PLAN_ID),
    );
    expect(res.status).toBe(400);
    // The whole write happens inside the function's transaction, so the route
    // never issues a delete of its own — nothing partial can be left behind.
    expect(rpcBuilders.replace_plan_stops).toBeDefined();
    expect(tables.plan_stops.delete).not.toHaveBeenCalled();
  });

  it("404s a plan the caller does not own, via the function's no_data_found", async () => {
    makeAuth({
      rpc: {
        replace_plan_stops: [
          { data: null, error: { code: 'P0002', message: 'plan not found' } },
        ],
      },
    });
    const res = await PUT(
      json({ title: 'X', target_date: '2026-10-02', stops: [] }),
      pathParams(PLAN_ID),
    );
    // 404, never 403 — a probe cannot tell another user's plan from a missing one.
    expect(res.status).toBe(404);
  });

  it('replaces title, date, and stops atomically, in array order', async () => {
    const { supabase, tables } = makeAuth({
      plans: [
        {
          // trailing loadPlanDetail
          data: {
            id: PLAN_ID,
            title: 'X',
            target_date: '2026-10-02',
            plan_stops: [
              {
                id: 's1',
                stop_time: '14:00:00',
                position: 0,
                businesses: { id: BIZ_A, shop_name: 'S', logo_url: null },
              },
            ],
          },
          error: null,
        },
      ],
      rpc: {
        replace_plan_stops: [{ data: null, error: null }],
        get_business_public_info: [{ data: null, error: null }],
      },
    });

    const res = await PUT(
      json({
        title: 'X',
        target_date: '2026-10-02',
        stops: [
          { business_id: BIZ_A, stop_time: null },
          { business_id: BIZ_B, stop_time: '14:00' },
        ],
      }),
      pathParams(PLAN_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.id).toBe(PLAN_ID);

    // One transactional call carries title, date, and the ordered stops; the
    // array order IS the stored position, assigned by WITH ORDINALITY in SQL.
    expect(supabase.rpc).toHaveBeenCalledWith('replace_plan_stops', {
      p_plan_id: PLAN_ID,
      p_title: 'X',
      p_target_date: '2026-10-02',
      p_stops: [
        { business_id: BIZ_A, stop_time: null },
        { business_id: BIZ_B, stop_time: '14:00' },
      ],
    });
    // No route-level delete/insert survives — that sequence was the bug.
    expect(tables.plan_stops.delete).not.toHaveBeenCalled();
    expect(tables.plan_stops.insert).not.toHaveBeenCalled();
    expect(tables.plans.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/protected/mobile/plans/:planId', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await DELETE(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(401);
  });

  it('204s (cascade takes the stops), even for an already-gone plan', async () => {
    const { tables } = makeAuth(); // plans.delete resolves { data: null, error: null }
    const res = await DELETE(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(204);
    expect(tables.plans.delete).toHaveBeenCalledWith();
    const eq = tables.plans.delete.mock.results[0].value.eq;
    expect(eq).toHaveBeenCalledWith('id', PLAN_ID);
  });

  it('never reports 404 for a non-owner — same 204', async () => {
    makeAuth(); // RLS scopes the delete; a non-owner row is indistinguishable
    const res = await DELETE(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(204);
  });

  it('returns 500 when the delete fails', async () => {
    makeAuth({ plans: [{ data: null, error: new Error('boom') }] });
    const res = await DELETE(json(null), pathParams(PLAN_ID));
    expect(res.status).toBe(500);
  });
});
