/**
 * /api/admin/bida-of-the-day — the editorial pick surface.
 *
 * Claims under test:
 *  - every method is admin-guarded (non-admins get the guard's response);
 *  - POST validates the payload (date format + UUID product) before touching
 *    the service;
 *  - POST upserts with the parsed { pick_date, product_id, note } payload;
 *  - DELETE removes by pick_date;
 *  - GET returns the picks list.
 *
 * The service layer (bidaOfTheDayService) and the DB query layer are mocked —
 * the SQL upsert semantics (ON CONFLICT pick_date, product pickability) live
 * in bidaOfTheDayQuery.ts and are exercised on the real local DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/utils/assertAuthorized', () => ({
  assertAuthorized: vi.fn(),
}));
vi.mock('@/lib/api/admin/bidaOfTheDayService', () => ({
  getBidaPicks: vi.fn(),
  createBidaPick: vi.fn(),
  removeBidaPick: vi.fn(),
  findBidaProducts: vi.fn(),
}));

import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as bidaService from '@/lib/api/admin/bidaOfTheDayService';
import { GET, POST, DELETE } from '../route';

const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost:3000/api/admin/bida-of-the-day', {
    method: body === undefined ? 'GET' : 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function makeDeleteRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/admin/bida-of-the-day', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assertAuthorized).mockResolvedValue({
    authorized: true,
  } as never);
});

describe('GET /api/admin/bida-of-the-day', () => {
  it('rejects non-admins with the guard response', async () => {
    const guardError = new NextResponse('Forbidden', { status: 403 });
    vi.mocked(assertAuthorized).mockResolvedValue({
      authorized: false,
      error: guardError,
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(bidaService.getBidaPicks).not.toHaveBeenCalled();
  });

  it('returns the scheduled picks for an admin', async () => {
    vi.mocked(bidaService.getBidaPicks).mockResolvedValue({
      success: true,
      data: { picks: [] },
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.picks).toEqual([]);
  });
});

describe('POST /api/admin/bida-of-the-day', () => {
  it('rejects a malformed date', async () => {
    const res = await POST(
      makeRequest({ pick_date: '12/08/2026', product_id: PRODUCT_ID }),
    );
    expect(res.status).toBe(400);
    expect(bidaService.createBidaPick).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID product id', async () => {
    const res = await POST(
      makeRequest({ pick_date: '2026-08-14', product_id: 'not-a-uuid' }),
    );
    expect(res.status).toBe(400);
    expect(bidaService.createBidaPick).not.toHaveBeenCalled();
  });

  it("accepts this app's seed-style UUIDs (non-RFC variant, e.g. ...3333)", async () => {
    // zod 4's `uuid()` is strict RFC-9562 and rejects the seed's own UUIDs
    // (variant nibble `3`); the route uses `z.guid()` per CLAUDE.md §Validation.
    vi.mocked(bidaService.createBidaPick).mockResolvedValue({
      success: true,
      data: { pick: {} as never },
    });
    const res = await POST(
      makeRequest({
        pick_date: '2026-08-14',
        product_id: '33333333-3333-3333-3333-333333333366',
      }),
    );
    expect(res.status).not.toBe(400);
    expect(bidaService.createBidaPick).toHaveBeenCalled();
  });

  it('upserts with the parsed payload for an admin', async () => {
    vi.mocked(bidaService.createBidaPick).mockResolvedValue({
      success: true,
      data: { pick: {} as never },
    });

    const res = await POST(
      makeRequest({
        pick_date: '2026-08-14',
        product_id: PRODUCT_ID,
        note: '  launch-week star  ',
      }),
    );
    expect(res.status).toBe(200);
    expect(bidaService.createBidaPick).toHaveBeenCalledWith({
      pick_date: '2026-08-14',
      product_id: PRODUCT_ID,
      note: 'launch-week star', // zod trims
    });
  });
});

describe('DELETE /api/admin/bida-of-the-day', () => {
  it('rejects a malformed date', async () => {
    const res = await DELETE(makeDeleteRequest({ pick_date: 'nope' }));
    expect(res.status).toBe(400);
    expect(bidaService.removeBidaPick).not.toHaveBeenCalled();
  });

  it('removes by pick_date for an admin', async () => {
    vi.mocked(bidaService.removeBidaPick).mockResolvedValue({
      success: true,
      data: null,
    });

    const res = await DELETE(makeDeleteRequest({ pick_date: '2026-08-14' }));
    expect(res.status).toBe(200);
    expect(bidaService.removeBidaPick).toHaveBeenCalledWith('2026-08-14');
  });
});
