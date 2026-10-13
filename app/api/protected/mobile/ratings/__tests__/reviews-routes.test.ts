/**
 * Business review routes (migration 20261013100000): every write is an RPC, and
 * the RPCs' stable error codes map to HTTP statuses with the user-facing hint
 * as `message`. Unknown DB errors stay an opaque, logged 500.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET as getMine,
  POST as postReview,
  DELETE as deleteReview,
} from '../businesses/[businessId]/route';
import { POST as postReport } from '../[ratingId]/report/route';
import { POST as postCheckin } from '../../checkins/route';
import { getMobileUser } from '@/app/api/helpers/mobile-request';

vi.mock('@/app/api/helpers/mobile-request', () => ({ getMobileUser: vi.fn() }));
vi.mock('@/lib/utils/captureError', () => ({ captureServerError: vi.fn() }));

const USER_ID = '11111111-2222-3333-4444-555555555555';
const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const RATING_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const bizParams = { params: Promise.resolve({ businessId: BUSINESS_ID }) };

type RpcResult = {
  data: unknown;
  error: { message: string; hint?: string; details?: string } | null;
};

function signedIn(...results: RpcResult[]) {
  const rpc = vi.fn();
  results.forEach((r) => rpc.mockResolvedValueOnce(r));
  (getMobileUser as Mock).mockResolvedValue({
    user: { id: USER_ID },
    supabase: { rpc },
  });
  return rpc;
}

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /protected/mobile/ratings/businesses/:id', () => {
  it('401s a guest', async () => {
    (getMobileUser as Mock).mockResolvedValue(null);
    const res = await postReview(req('POST', { rating: 5 }), bizParams);
    expect(res.status).toBe(401);
  });

  it('400s a rating outside 1–5 without calling the RPC', async () => {
    const rpc = signedIn();
    const res = await postReview(req('POST', { rating: 9 }), bizParams);
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls upsert_business_rating and wraps the row', async () => {
    const row = {
      id: RATING_ID,
      rating: 5,
      comment: 'Nice',
      evidence: 'checkin',
    };
    const rpc = signedIn({ data: row, error: null });
    const res = await postReview(
      req('POST', { rating: 5, comment: 'Nice' }),
      bizParams,
    );
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('upsert_business_rating', {
      p_business: BUSINESS_ID,
      p_rating: 5,
      p_comment: 'Nice',
    });
    expect(await res.json()).toEqual({ rating: row });
  });

  it.each([
    ['NO_VISIT', 403],
    ['REVIEWS_DISABLED', 403],
    ['UNDER_REVIEW', 409],
    ['COMMENT_REJECTED', 422],
    ['RATE_LIMITED', 429],
    ['REVIEWS_PAUSED', 503],
  ])('maps %s to %i with code + hint', async (code, status) => {
    signedIn({ data: null, error: { message: code, hint: 'Human line' } });
    const res = await postReview(req('POST', { rating: 4 }), bizParams);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ code, message: 'Human line' });
  });

  it('keeps unknown DB errors opaque (500, no DB text)', async () => {
    signedIn({ data: null, error: { message: 'relation "x" does not exist' } });
    const res = await postReview(req('POST', { rating: 4 }), bizParams);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('relation');
  });
});

describe('GET + DELETE /protected/mobile/ratings/businesses/:id', () => {
  it('returns { mine, eligibility } from the RPC', async () => {
    const state = {
      mine: null,
      eligibility: { can_review: false, reason: 'NO_VISIT' },
    };
    signedIn({ data: state, error: null });
    const res = await getMine(req('GET'), bizParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(state);
  });

  it('204s a delete, 404s when there was nothing to delete', async () => {
    signedIn({ data: true, error: null });
    expect((await deleteReview(req('DELETE'), bizParams)).status).toBe(204);
    signedIn({ data: false, error: null });
    expect((await deleteReview(req('DELETE'), bizParams)).status).toBe(404);
  });
});

describe('POST /protected/mobile/ratings/:ratingId/report', () => {
  const params = { params: Promise.resolve({ ratingId: RATING_ID }) };

  it('400s an unknown reason', async () => {
    const rpc = signedIn();
    const res = await postReport(req('POST', { reason: 'meh' }), params);
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('204s a report and maps OWN_REVIEW to 403', async () => {
    signedIn({ data: { hidden: false }, error: null });
    expect(
      (await postReport(req('POST', { reason: 'spam' }), params)).status,
    ).toBe(204);
    signedIn({
      data: null,
      error: {
        message: 'OWN_REVIEW',
        hint: "You can't report your own review",
      },
    });
    expect(
      (await postReport(req('POST', { reason: 'spam' }), params)).status,
    ).toBe(403);
  });
});

describe('POST /protected/mobile/checkins', () => {
  const fix = {
    business_id: BUSINESS_ID,
    lat: 10.7,
    lng: 122.5,
    accuracy_m: 12,
    mocked: false,
  };

  it('records the check-in and returns fresh eligibility', async () => {
    const rpc = signedIn(
      { data: { checked_in_on: '2026-10-13', distance_m: 40 }, error: null },
      {
        data: {
          mine: null,
          eligibility: { can_review: true, evidence: 'checkin' },
        },
        error: null,
      },
    );
    const res = await postCheckin(req('POST', fix));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenNthCalledWith(1, 'record_business_checkin', {
      p_business: BUSINESS_ID,
      p_lat: 10.7,
      p_lng: 122.5,
      p_accuracy_m: 12,
      p_mocked: false,
    });
    expect(await res.json()).toEqual({
      checkin: { checked_in_on: '2026-10-13', distance_m: 40 },
      eligibility: { can_review: true, evidence: 'checkin' },
    });
  });

  it('maps TOO_FAR to 422 and surfaces the distance', async () => {
    signedIn({
      data: null,
      error: { message: 'TOO_FAR', hint: 'Be at the shop', details: '812' },
    });
    const res = await postCheckin(req('POST', fix));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      code: 'TOO_FAR',
      message: 'Be at the shop',
      distance_m: 812,
    });
  });

  it('400s a missing fix without calling the RPC', async () => {
    const rpc = signedIn();
    const res = await postCheckin(req('POST', { business_id: BUSINESS_ID }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
