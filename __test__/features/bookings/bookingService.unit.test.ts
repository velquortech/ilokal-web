/**
 * bookingService — the RPC boundary.
 *
 * The gate matrix itself is DB-side and covered by
 * `supabase/tests/booking_requests.test.sql`. What matters here is the thing
 * only this layer can get wrong: turning a SQLSTATE into user-safe copy
 * without leaking a driver message (CLAUDE.md error-leakage rule).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestBooking,
  decideBooking,
  cancelBooking,
} from '@/lib/api/bookings/bookingService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function mockRpc(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue({
    data: result.data ?? null,
    error: result.error ?? null,
  });
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    rpc,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
  return rpc;
}

const INPUT = {
  product_id: '11111111-1111-1111-1111-111111111111',
  starts_at: '2026-08-01T09:00:00.000Z',
};

beforeEach(() => vi.clearAllMocks());

describe('requestBooking', () => {
  it('calls the RPC with the mapped parameter names', async () => {
    const rpc = mockRpc({ data: { id: 'b1', status: 'pending' } });

    const result = await requestBooking({
      ...INPUT,
      ends_at: '2026-08-03T09:00:00.000Z',
      branch_id: '22222222-2222-2222-2222-222222222222',
      party_size: 4,
      notes: 'child seat',
    });

    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('request_booking', {
      p_product_id: INPUT.product_id,
      p_starts_at: INPUT.starts_at,
      p_ends_at: '2026-08-03T09:00:00.000Z',
      p_branch_id: '22222222-2222-2222-2222-222222222222',
      p_party_size: 4,
      p_notes: 'child seat',
    });
  });

  it('maps a unique violation to a "slot taken" message, not a driver error', async () => {
    mockRpc({
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "x_pkey"',
      },
    });

    const result = await requestBooking(INPUT);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NO_AVAILABILITY');
    expect(result.error?.message).toMatch(/just taken/i);
    // The constraint name must not reach the client.
    expect(result.error?.message).not.toMatch(/constraint|pkey/i);
  });

  it('maps an auth failure to a sign-in prompt', async () => {
    mockRpc({ error: { code: '42501', message: 'authentication required' } });

    const result = await requestBooking(INPUT);

    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(result.error?.message).toMatch(/sign in/i);
  });

  it('maps a missing offering to NOT_FOUND', async () => {
    mockRpc({ error: { code: 'P0002', message: 'offering not found' } });

    expect((await requestBooking(INPUT)).error?.code).toBe('NOT_FOUND');
  });

  it('surfaces the RPC validation copy, which is written for end users', async () => {
    mockRpc({
      error: { code: '22023', message: 'this offering needs more notice' },
    });

    const result = await requestBooking(INPUT);

    expect(result.error?.code).toBe('INVALID_REQUEST');
    expect(result.error?.message).toBe('This offering needs more notice');
  });

  it('falls back to a generic message on an unmapped SQLSTATE', async () => {
    mockRpc({
      error: {
        code: '42P01',
        message: 'relation "booking_requests" does not exist',
      },
    });

    const result = await requestBooking(INPUT);

    expect(result.error?.code).toBe('INTERNAL_ERROR');
    expect(result.error?.message).toBe(
      'Something went wrong. Please try again.',
    );
    expect(result.error?.message).not.toMatch(/relation|booking_requests/);
  });

  it('never throws when the client itself blows up', async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(
      new Error('no cookies'),
    );

    await expect(requestBooking(INPUT)).resolves.toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR' },
    });
  });
});

describe('decideBooking', () => {
  it('passes the decision, note, and quote through', async () => {
    const rpc = mockRpc({ data: { id: 'b1', status: 'confirmed' } });

    await decideBooking('b1', 'confirmed', {
      note: 'See you then',
      quotedAmount: 3500,
    });

    expect(rpc).toHaveBeenCalledWith('decide_booking', {
      p_booking_id: 'b1',
      p_status: 'confirmed',
      p_decision_note: 'See you then',
      p_quoted_amount: 3500,
    });
  });

  it('maps the "already decided" guard to a readable message', async () => {
    mockRpc({
      error: {
        code: '22023',
        message: 'this booking has already been decided',
      },
    });

    const result = await decideBooking('b1', 'confirmed');

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/already been decided/i);
  });
});

describe('cancelBooking', () => {
  it('calls the RPC with the booking id', async () => {
    const rpc = mockRpc({ data: { id: 'b1', status: 'cancelled' } });

    const result = await cancelBooking('b1');

    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('cancel_booking', { p_booking_id: 'b1' });
  });

  it('maps someone else’s booking to NOT_FOUND rather than revealing it exists', async () => {
    mockRpc({ error: { code: 'P0002', message: 'booking not found' } });

    expect((await cancelBooking('b1')).error?.code).toBe('NOT_FOUND');
  });
});
