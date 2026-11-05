/**
 * POST /api/protected/mobile/redemptions — the RPC hand-off.
 *
 * The claim gates, insert and counter bump live in the `redeem_coupon` RPC
 * (migration 20261024000000; behaviour pinned by
 * supabase/tests/redemption_lockdown.test.sql). This file pins the route's
 * half: the RPC call, the status/body each RPC code maps to (unchanged from
 * when the gates lived here, so the mobile client sees the same responses),
 * and the non-fatal owner notification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { POST } from '../route';

// GUID-shaped ids — z.guid() in redeemCouponSchema rejects non-hex prefixes
// (e.g. 'cou-…'), which would 400 the request before any redemption logic runs.
const USER_ID = '11111111-0000-0000-0000-000000000001';
const COUPON_ID = '22222222-0000-0000-0000-000000000001';
const BRANCH_ID = '33333333-0000-0000-0000-000000000001';
const REDEMPTION_ID = '55555555-0000-0000-0000-000000000001';

type RpcResult = { data: unknown; error: unknown };

function makeAuth(opts: { redeem?: RpcResult; notify?: RpcResult } = {}) {
  const rpc = vi.fn((name: string) => {
    if (name === 'redeem_coupon')
      return Promise.resolve(
        opts.redeem ?? { data: { id: REDEMPTION_ID }, error: null },
      );
    if (name === 'notify_coupon_redemption')
      return Promise.resolve(opts.notify ?? { data: 'notif-1', error: null });
    return Promise.resolve({ data: null, error: null });
  });
  // Redeem must not touch a table directly — client writes are revoked.
  const from = vi.fn((table: string) => {
    throw new Error(`unexpected table ${table}`);
  });

  const auth = { user: { id: USER_ID }, token: 't', supabase: { from, rpc } };
  vi.mocked(getMobileUser).mockResolvedValue(
    auth as unknown as Awaited<ReturnType<typeof getMobileUser>>,
  );
  return { rpc, from };
}

function makeRequest(
  body: unknown = { coupon_id: COUPON_ID, branch_id: BRANCH_ID },
) {
  return new NextRequest('http://localhost/api/protected/mobile/redemptions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/protected/mobile/redemptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('redeems through redeem_coupon and notifies the owner', async () => {
    const { rpc, from } = makeAuth();

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.redemption).toEqual({ id: REDEMPTION_ID });
    expect(rpc).toHaveBeenCalledWith('redeem_coupon', {
      p_coupon_id: COUPON_ID,
      p_branch_id: BRANCH_ID,
    });
    expect(rpc).toHaveBeenCalledWith('notify_coupon_redemption', {
      p_redemption_id: REDEMPTION_ID,
    });
    expect(rpc).not.toHaveBeenCalledWith(
      'increment_coupon_redemptions',
      expect.anything(),
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('still succeeds when the notification RPC errors (non-fatal)', async () => {
    makeAuth({ notify: { data: null, error: { message: 'notify boom' } } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).redemption).toEqual({ id: REDEMPTION_ID });
  });

  it('400s a malformed body before calling the RPC', async () => {
    const { rpc } = makeAuth();
    const res = await POST(
      makeRequest({ coupon_id: 'nope', branch_id: BRANCH_ID }),
    );
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['COUPON_NOT_FOUND', 'Coupon not found or not yet active', 400],
    ['BRANCH_MISMATCH', 'This deal cannot be redeemed at that branch', 400],
    ['COUPON_EXPIRED', 'Coupon has expired', 400],
    ['COUPON_LIMIT_REACHED', 'Coupon has reached its redemption limit', 400],
    ['FOLLOW_REQUIRED', 'Follow this business to claim this deal', 403],
    ['ALREADY_IN_WALLET', 'You already have this deal in your wallet', 400],
    [
      'PER_USER_LIMIT_REACHED',
      'You have already redeemed this coupon the maximum number of times',
      400,
    ],
  ])('%s → %i with the user copy', async (code, hint, status) => {
    const { rpc } = makeAuth({
      redeem: { data: null, error: { message: code, hint, code: 'P0001' } },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ code, message: hint });
    expect(rpc).not.toHaveBeenCalledWith(
      'notify_coupon_redemption',
      expect.anything(),
    );
  });

  it('an unknown DB error is a 500 that never forwards the DB text', async () => {
    makeAuth({
      redeem: {
        data: null,
        error: {
          message: 'permission denied for table user_redemptions',
          code: '42501',
        },
      },
    });

    const res = await POST(makeRequest());
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(text).not.toContain('permission denied');
  });
});
