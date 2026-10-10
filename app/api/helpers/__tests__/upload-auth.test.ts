import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const getUser = vi.fn();
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));

import { requireUploadShop, requireUploadUser } from '../upload-auth';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

const SHOP = '11111111-1111-4111-8111-111111111111';
const verify = vi.mocked(verifyBusinessOwner);

beforeEach(() => {
  getUser.mockReset();
  verify.mockReset();
});

describe('requireUploadUser', () => {
  it('returns the signed-in user id', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    expect(await requireUploadUser('t')).toEqual({ userId: 'user-1' });
  });

  // The upload rate limit is keyed on this id, so "no id" must stop the
  // request rather than reach the guard.
  it.each([
    ['no session', () => getUser.mockResolvedValue({ data: { user: null } })],
    [
      'a user without an id',
      () => getUser.mockResolvedValue({ data: { user: {} } }),
    ],
    ['a lookup that throws', () => getUser.mockRejectedValue(new Error('x'))],
  ])('answers 401 for %s', async (_label, arrange) => {
    arrange();
    const res = await requireUploadUser('t');
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });
});

describe('requireUploadShop', () => {
  it.each([
    ['missing', null],
    ['empty', ''],
  ])(
    'answers 400 for a %s businessId without looking up any shop',
    async (_label, id) => {
      const res = await requireUploadShop('t', id);
      expect((res as NextResponse).status).toBe(400);
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['AUTHENTICATION_ERROR', 401],
    ['VALIDATION_ERROR', 400],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 403],
  ])('maps %s to %i', async (code, status) => {
    verify.mockResolvedValue({
      authorized: false,
      error: { code, message: 'no' },
    });
    const res = await requireUploadShop('t', SHOP);
    expect((res as NextResponse).status).toBe(status);
  });

  it('returns the verified id of the shop asked about', async () => {
    verify.mockResolvedValue({
      authorized: true,
      user: { id: 'user-1' },
      business: { id: SHOP },
    });
    expect(await requireUploadShop('t', SHOP)).toEqual({ businessId: SHOP });
    expect(verify).toHaveBeenCalledWith(SHOP);
  });
});
