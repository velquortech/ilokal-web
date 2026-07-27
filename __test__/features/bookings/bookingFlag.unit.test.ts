/**
 * `enable_bookings` kill switch.
 *
 * The flag must fail CLOSED: an unreadable or missing row hides the booking UI
 * rather than exposing a half-configured flow. (The DB enforces the same flag
 * inside `request_booking`, so this is defense in depth, not the boundary.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBookingsEnabled } from '@/lib/api/appSettings';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function mockSetting(result: {
  data?: { value: unknown } | null;
  error?: { message: string } | null;
}) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: result.data ?? null,
            error: result.error ?? null,
          }),
        }),
      }),
    }),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
}

beforeEach(() => vi.clearAllMocks());

describe('getBookingsEnabled', () => {
  it('is true only for a literal boolean true', async () => {
    mockSetting({ data: { value: true } });
    await expect(getBookingsEnabled()).resolves.toBe(true);
  });

  it('is false when the flag is off', async () => {
    mockSetting({ data: { value: false } });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed when the row is missing', async () => {
    mockSetting({ data: null });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed on a query error', async () => {
    mockSetting({ data: null, error: { message: 'connection reset' } });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed when the client throws', async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(new Error('boom'));
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed on a truthy-but-not-boolean value', async () => {
    // A JSONB "true" string, or 1, must not switch the feature on — the
    // admin UI writes real booleans and anything else is a misconfiguration.
    for (const value of ['true', 1, {}, []]) {
      mockSetting({ data: { value } });
      await expect(getBookingsEnabled()).resolves.toBe(false);
    }
  });
});
