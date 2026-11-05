/**
 * PATCH /api/protected/mobile/redemptions/:id/claim — goes through the
 * `claim_my_redemption` RPC (one-way, own row, unexpired; migration
 * 20261024000000). Pins the call, the unchanged response shape, and the
 * status each RPC code maps to.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';
import { PATCH } from '../route';

const USER_ID = '11111111-0000-0000-0000-000000000001';
const REDEMPTION_ID = '55555555-0000-0000-0000-000000000001';

const claimedRow = {
  id: REDEMPTION_ID,
  user_id: USER_ID,
  coupon_id: '22222222-0000-0000-0000-000000000001',
  branch_id: null,
  code: 'ABC123',
  is_claimed: true,
  redeemed_at: '2026-10-24T00:00:00.000Z',
  expires_at: '2026-12-31T00:00:00.000Z',
};

function makeAuth(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn(() => Promise.resolve(result));
  const from = vi.fn((table: string) => {
    throw new Error(`unexpected table ${table}`);
  });
  vi.mocked(getMobileUser).mockResolvedValue({
    user: { id: USER_ID },
    token: 't',
    supabase: { rpc, from },
  } as unknown as Awaited<ReturnType<typeof getMobileUser>>);
  return { rpc, from };
}

function call(id = REDEMPTION_ID) {
  return PATCH(
    new NextRequest(
      `http://localhost/api/protected/mobile/redemptions/${id}/claim`,
      {
        method: 'PATCH',
      },
    ),
    { params: Promise.resolve({ id }) },
  );
}

describe('PATCH /api/protected/mobile/redemptions/:id/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('401s without a session', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
  });

  it('claims through claim_my_redemption and keeps the response shape', async () => {
    const { rpc, from } = makeAuth({ data: claimedRow, error: null });

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      redemption: {
        id: REDEMPTION_ID,
        is_claimed: true,
        redeemed_at: claimedRow.redeemed_at,
        expires_at: claimedRow.expires_at,
      },
    });
    expect(rpc).toHaveBeenCalledWith('claim_my_redemption', {
      p_redemption_id: REDEMPTION_ID,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('404s a malformed id without calling the RPC', async () => {
    const { rpc } = makeAuth({ data: claimedRow, error: null });
    const res = await call('not-a-uuid');
    expect(res.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['REDEMPTION_NOT_FOUND', 'Redemption not found', 404],
    ['ALREADY_CLAIMED', 'Redemption already claimed', 400],
    ['REDEMPTION_EXPIRED', 'Redemption has expired', 400],
  ])('%s → %i', async (code, hint, status) => {
    makeAuth({ data: null, error: { message: code, hint, code: 'P0001' } });
    const res = await call();
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ code, message: hint });
  });
});
