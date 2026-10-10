import { describe, it, expect, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import {
  countBusinessesByStatus,
  REGISTRATION_UNFINISHED_MESSAGE,
  updateBusinessStatus,
} from '../businessQuery';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

function mockClient(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['update', 'eq', 'select']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  // countBusinessesByStatus awaits `.select(...)` directly.
  chain.then = vi.fn((resolve) => resolve(result));
  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
    from: vi.fn().mockReturnValue(chain),
  });
}

describe('updateBusinessStatus — unfinished registrations', () => {
  it('turns the verify-before-completion CHECK into a sentence an admin can act on', async () => {
    mockClient({
      data: null,
      error: {
        code: '23514',
        message:
          'new row for relation "businesses" violates check constraint "businesses_verified_requires_registration"',
      },
    });

    const result = await updateBusinessStatus('b1', 'verified');

    expect(result.error).toBe(REGISTRATION_UNFINISHED_MESSAGE);
  });

  it('keeps the generic message for any other failure', async () => {
    mockClient({ data: null, error: { code: '42501', message: 'denied' } });

    const result = await updateBusinessStatus('b1', 'verified');

    expect(result.error).toBe('Failed to update business');
  });
});

describe('countBusinessesByStatus', () => {
  /**
   * Each count is its own head-only query; the filters a call applies decide
   * the count it resolves to, the way PostgREST would.
   */
  function mockCounts(byFilters: Record<string, number>) {
    const node = (filters: string[]) => ({
      eq: vi.fn((c: string, v: string) => node([...filters, `${c}=${v}`])),
      not: vi.fn((c: string) => node([...filters, `${c}!null`])),
      then: (resolve: (r: unknown) => void) =>
        resolve({
          count: byFilters[filters.join('&') || 'all'] ?? 0,
          error: null,
        }),
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn(() => ({ select: vi.fn(() => node([])) })),
    });
  }

  it('counts past the 1,000-row cap that froze the cards at "Total 1000"', async () => {
    mockCounts({ all: 1505, 'status=verified': 1503 });

    const { counts } = await countBusinessesByStatus();

    expect(counts.total).toBe(1505);
    expect(counts.verified).toBe(1503);
  });

  it('counts Pending only for finished registrations — there is nothing to review yet', async () => {
    mockCounts({
      'status=pending&registration_completed_at!null': 1,
      'status=pending': 2,
    });

    const { counts } = await countBusinessesByStatus();

    expect(counts.pending).toBe(1);
  });
});
