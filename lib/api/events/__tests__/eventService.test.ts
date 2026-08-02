/**
 * Event writes — the coordinate guard.
 *
 * The bug this pins: the edit form sent `latitude: null, longitude: null` on
 * every save (nothing read the stored point back), and `toRow` wrote
 * `location` whenever either key was merely PRESENT. So editing an event's
 * name silently erased its pin and dropped it out of `events_nearby`, the
 * `/events/nearby` page and the mobile endpoint — with no error anywhere.
 *
 * The rule now: `location` is written only when a real pair arrives.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { updateEvent, createEvent } from '../eventService';
import type { UpdateEventInput } from '@/lib/validation/events';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

function mockClient() {
  const maybeSingle = vi.fn(async () => ({
    data: { id: 'evt-1' },
    error: null,
  }));
  const single = vi.fn(async () => ({ data: { id: 'evt-1' }, error: null }));
  const select = vi.fn(() => ({ maybeSingle, single }));
  const is = vi.fn(() => ({ select }));
  const eq2 = vi.fn(() => ({ is }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn((_payload: Record<string, unknown>) => ({ eq: eq1 }));
  const insert = vi.fn((_payload: Record<string, unknown>) => ({ select }));
  const from = vi.fn(() => ({ update, insert }));

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

  return { update, insert };
}

const BASE = { name: 'Renamed' } as UpdateEventInput;

beforeEach(() => vi.clearAllMocks());

describe('the point is never written without a real pair', () => {
  it('omits location entirely when no coordinates are sent', async () => {
    const { update } = mockClient();

    await updateEvent('evt-1', 'biz-1', BASE);

    const payload = update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('location');
    expect(payload).toHaveProperty('name', 'Renamed');
  });

  it('omits location when both coordinates are null', async () => {
    const { update } = mockClient();

    // Exactly what the old edit form sent on every single save.
    await updateEvent('evt-1', 'biz-1', {
      ...BASE,
      latitude: null,
      longitude: null,
    } as UpdateEventInput);

    expect(update.mock.calls[0][0]).not.toHaveProperty('location');
  });

  it('omits location when only one coordinate arrives', async () => {
    const { update } = mockClient();

    await updateEvent('evt-1', 'biz-1', {
      ...BASE,
      latitude: 10.6973,
    } as UpdateEventInput);

    // Half a pair would put the pin on the prime meridian.
    expect(update.mock.calls[0][0]).not.toHaveProperty('location');
  });

  it('writes the point when a real pair arrives', async () => {
    const { update } = mockClient();

    await updateEvent('evt-1', 'biz-1', {
      ...BASE,
      latitude: 10.6973,
      longitude: 122.5649,
    } as UpdateEventInput);

    // Longitude FIRST in WKT — the opposite of how it is said aloud, and the
    // reason a swapped pair lands in the Indian Ocean rather than erroring.
    expect(update.mock.calls[0][0]).toHaveProperty(
      'location',
      'SRID=4326;POINT(122.5649 10.6973)',
    );
  });

  it('applies the same rule on create', async () => {
    const { insert } = mockClient();

    await createEvent('biz-1', {
      name: 'New',
      address: 'x',
      starts_at: '2036-08-07T02:00:00.000Z',
      ends_at: '2036-08-09T14:00:00.000Z',
      latitude: null,
      longitude: null,
    } as never);

    expect(insert.mock.calls[0][0]).not.toHaveProperty('location');
  });
});
