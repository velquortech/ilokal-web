/**
 * The public feature-flag reader (`enable_bookings`, `enable_events`).
 *
 * The flag must fail CLOSED: an unreadable or missing answer hides the feature
 * rather than exposing a half-configured flow. (Each feature enforces its own
 * flag in the DB too, so this is defense in depth, not the boundary.)
 *
 * Read via the `public_feature_flags` RPC rather than the `app_settings` table:
 * that table is readable `TO authenticated` only, so a direct select returns
 * nothing for an anonymous visitor and this reader fails closed — which made
 * the entire public events surface invisible to logged-out users. The RPC is
 * SECURITY DEFINER with a fixed return list.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBookingsEnabled, getEventsEnabled } from '@/lib/api/appSettings';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function mockFlags(result: {
  data?: Record<string, unknown> | null;
  error?: { message: string } | null;
}) {
  const rpc = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  });

  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    rpc,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { rpc };
}

beforeEach(() => vi.clearAllMocks());

describe('the reader goes through the RPC, not the table', () => {
  it('calls public_feature_flags', async () => {
    const { rpc } = mockFlags({
      data: { enable_bookings: true, enable_events: false },
    });

    await getBookingsEnabled();

    // A `from('app_settings')` read here returns zero rows for anon.
    expect(rpc).toHaveBeenCalledWith('public_feature_flags');
  });

  it('reads each flag from its own column', async () => {
    mockFlags({ data: { enable_bookings: false, enable_events: true } });
    await expect(getEventsEnabled()).resolves.toBe(true);

    mockFlags({ data: { enable_bookings: false, enable_events: true } });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });
});

describe('getBookingsEnabled', () => {
  it('is true only for a literal boolean true', async () => {
    mockFlags({ data: { enable_bookings: true } });
    await expect(getBookingsEnabled()).resolves.toBe(true);
  });

  it('is false when the flag is off', async () => {
    mockFlags({ data: { enable_bookings: false } });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed when the RPC returns nothing', async () => {
    mockFlags({ data: null });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed on a query error', async () => {
    mockFlags({ data: null, error: { message: 'connection reset' } });
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed when the client throws', async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(new Error('boom'));
    await expect(getBookingsEnabled()).resolves.toBe(false);
  });

  it('fails closed on a truthy-but-not-boolean value', async () => {
    // A JSONB "true" string, or 1, must not switch the feature on — the admin
    // UI writes real booleans and anything else is a misconfiguration.
    for (const value of ['true', 1, {}, []]) {
      mockFlags({ data: { enable_bookings: value } });
      await expect(getBookingsEnabled()).resolves.toBe(false);
    }
  });
});

describe('getEventsEnabled', () => {
  it('is true only for a literal boolean true', async () => {
    mockFlags({ data: { enable_events: true } });
    await expect(getEventsEnabled()).resolves.toBe(true);
  });

  it('fails closed on every unusable answer', async () => {
    for (const data of [
      null,
      {},
      { enable_events: 'true' },
      { enable_events: 1 },
    ]) {
      mockFlags({ data });
      await expect(getEventsEnabled()).resolves.toBe(false);
    }
  });

  it('rethrows the dynamic-usage bailout instead of answering false', async () => {
    // `cookies()` throws to say "this route must be dynamic". Swallowing it
    // would prerender the page with the feature switched OFF, permanently.
    vi.mocked(createServerSupabaseClient).mockRejectedValue(
      Object.assign(new Error('Dynamic server usage: cookies'), {
        digest: 'DYNAMIC_SERVER_USAGE',
      }),
    );
    await expect(getEventsEnabled()).rejects.toThrow('Dynamic server usage');
  });
});
