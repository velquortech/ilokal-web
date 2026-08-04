/**
 * Platform-event writes — the staff-pick path.
 *
 * One claim carries this file: **`business_id IS NULL` is part of the WHERE,
 * not a check the caller is trusted to make.** The admin RLS policy covers
 * every row in `events`, so without that predicate these functions would edit
 * and archive a SHOP's event too — silently, with nobody told. A shop's event
 * comes down through reject-with-a-reason, which notifies its owner.
 *
 * The second claim: no driver text reaches the client. A raw PostgREST message
 * names tables, columns and constraints.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { updatePlatformEvent, archivePlatformEvent } from '../eventService';
import type { UpdateEventInput } from '@/lib/validation/events';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

type Row = { id: string } | null;

/**
 * Records the whole filter chain, so a missing `.is('business_id', null)` is
 * a failing assertion rather than an invisible widening.
 */
function mockClient(result: { data: Row; error: { code?: string } | null }) {
  const filters: Array<[string, unknown[]]> = [];
  const payloads: Record<string, unknown>[] = [];

  const proxy: Record<string, unknown> = {
    eq: (...args: unknown[]) => {
      filters.push(['eq', args]);
      return proxy;
    },
    is: (...args: unknown[]) => {
      filters.push(['is', args]);
      return proxy;
    },
    select: () => proxy,
    maybeSingle: async () => result,
  };

  const update = vi.fn((payload: Record<string, unknown>) => {
    payloads.push(payload);
    return proxy;
  });
  const from = vi.fn(() => ({ update }));

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { filters, payloads };
}

const OK = { data: { id: 'evt-1' }, error: null };
const NO_MATCH = { data: null, error: null };

beforeEach(() => vi.clearAllMocks());

describe('updatePlatformEvent', () => {
  it('scopes the write to platform events and live rows', async () => {
    const { filters } = mockClient(OK);

    await updatePlatformEvent('evt-1', { name: 'Renamed' } as UpdateEventInput);

    expect(filters).toContainEqual(['eq', ['id', 'evt-1']]);
    expect(filters).toContainEqual(['is', ['business_id', null]]);
    expect(filters).toContainEqual(['is', ['archived_at', null]]);
  });

  it('pins product_id to null', async () => {
    const { payloads } = mockClient(OK);

    await updatePlatformEvent('evt-1', {
      name: 'Renamed',
      product_id: '550e8400-e29b-41d4-a716-446655440000',
    } as UpdateEventInput);

    // A platform event has no shop, and the composite FK needs a business_id —
    // so an offering is dropped rather than handed to the DB to reject.
    expect(payloads[0].product_id).toBeNull();
  });

  it('reports NOT_FOUND when the id belongs to a shop event', async () => {
    mockClient(NO_MATCH);

    const result = await updatePlatformEvent('evt-1', {} as UpdateEventInput);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('never leaks the driver message', async () => {
    mockClient({
      data: null,
      error: {
        code: '23514',
        message: 'violates check constraint "events_date_order"',
      } as { code?: string },
    });

    const result = await updatePlatformEvent('evt-1', {} as UpdateEventInput);

    expect(result.error?.message).not.toContain('events_date_order');
    expect(result.error?.message).toBe(
      'Check the dates, times and links, then try again.',
    );
  });
});

describe('archivePlatformEvent', () => {
  it('soft-deletes, scoped to platform events', async () => {
    const { filters, payloads } = mockClient(OK);

    const result = await archivePlatformEvent('evt-1');

    expect(result.success).toBe(true);
    expect(payloads[0]).toHaveProperty('archived_at');
    expect(filters).toContainEqual(['is', ['business_id', null]]);
  });

  it('refuses a shop event', async () => {
    mockClient(NO_MATCH);

    const result = await archivePlatformEvent('evt-1');

    // Taking a shop's event down is the reject path, which tells the owner why.
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('cannot double-archive', async () => {
    const { filters } = mockClient(OK);

    await archivePlatformEvent('evt-1');

    expect(filters).toContainEqual(['is', ['archived_at', null]]);
  });
});
