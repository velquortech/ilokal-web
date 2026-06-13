/**
 * Coupon-redemption → owner notification.
 * After a successful redemption, the route calls the notify_coupon_redemption
 * RPC (which notifies the business owner). The call is non-fatal: an RPC error
 * is logged but never fails the redemption response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { POST } from '../route';

const USER_ID = 'usr-00000000-0000-0000-0000-000000000001';
const COUPON_ID = 'cou-00000000-0000-0000-0000-000000000001';
const BRANCH_ID = 'brn-00000000-0000-0000-0000-000000000001';
const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const REDEMPTION_ID = 'red-00000000-0000-0000-0000-000000000001';

const coupon = {
  id: COUPON_ID,
  start_date: new Date(Date.now() - 86_400_000).toISOString(),
  expiry_date: new Date(Date.now() + 86_400_000).toISOString(),
  status: 'published',
  max_redemptions_per_user: null,
  max_redemptions_global: null,
  current_redemptions: 0,
  requires_subscription: false,
  business_id: BUSINESS_ID,
};

/**
 * Chainable builder that is both awaitable (resolves to `selectResult`) and
 * supports `.insert().select().single()` / `.select()....single()`.
 */
function tableBuilder(handlers: {
  selectResult?: { data: unknown; error: unknown };
  selectSingleResult?: { data: unknown; error: unknown };
  insertSingleResult?: { data: unknown; error: unknown };
}) {
  let mode: 'select' | 'insert' = 'select';
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  builder.select = vi.fn(ret);
  builder.insert = vi.fn(() => {
    mode = 'insert';
    return builder;
  });
  builder.eq = vi.fn(ret);
  builder.is = vi.fn(ret);
  builder.lte = vi.fn(ret);
  builder.not = vi.fn(ret);
  builder.or = vi.fn(ret);
  builder.delete = vi.fn(ret);
  builder.single = vi.fn(() =>
    Promise.resolve(
      mode === 'insert'
        ? handlers.insertSingleResult
        : handlers.selectSingleResult,
    ),
  );
  // Awaiting a chain that doesn't end in .single() resolves selectResult.
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve(handlers.selectResult ?? { data: [], error: null });
  return builder;
}

function makeAuth(notifyResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn((name: string) => {
    if (name === 'increment_coupon_redemptions')
      return Promise.resolve({ data: true, error: null });
    if (name === 'notify_coupon_redemption')
      return Promise.resolve(notifyResult);
    return Promise.resolve({ data: null, error: null });
  });

  const from = vi.fn((table: string) => {
    if (table === 'coupons')
      return tableBuilder({
        selectSingleResult: { data: coupon, error: null },
      });
    // user_redemptions: select-existing resolves [], insert returns the new row.
    return tableBuilder({
      selectResult: { data: [], error: null },
      insertSingleResult: { data: { id: REDEMPTION_ID }, error: null },
    });
  });

  return {
    user: { id: USER_ID },
    token: 't',
    supabase: { from, rpc },
    rpc,
  };
}

function makeRequest() {
  return new NextRequest('http://localhost/api/protected/mobile/redemptions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ coupon_id: COUPON_ID, branch_id: BRANCH_ID }),
  });
}

describe('POST /api/protected/mobile/redemptions → owner notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls notify_coupon_redemption with the new redemption id after redeeming', async () => {
    const auth = makeAuth({ data: 'notif-1', error: null });
    vi.mocked(getMobileUser).mockResolvedValue(
      auth as unknown as Awaited<ReturnType<typeof getMobileUser>>,
    );

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.redemption).toEqual({ id: REDEMPTION_ID });
    expect(auth.rpc).toHaveBeenCalledWith('notify_coupon_redemption', {
      p_redemption_id: REDEMPTION_ID,
    });
  });

  it('still succeeds when the notification RPC errors (non-fatal)', async () => {
    const auth = makeAuth({ data: null, error: { message: 'notify boom' } });
    vi.mocked(getMobileUser).mockResolvedValue(
      auth as unknown as Awaited<ReturnType<typeof getMobileUser>>,
    );

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.redemption).toEqual({ id: REDEMPTION_ID });
    expect(auth.rpc).toHaveBeenCalledWith('notify_coupon_redemption', {
      p_redemption_id: REDEMPTION_ID,
    });
  });
});
