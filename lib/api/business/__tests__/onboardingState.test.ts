/**
 * The two STORED onboarding facts (phase 3).
 *
 * Everything else about onboarding is derived; these two are the exceptions,
 * and each has a failure mode worth pinning. The row is created lazily, so a
 * brand-new shop has none — reading that as an error would put every new
 * owner's dashboard on the failure path. And a failed read must read as "not
 * answered", because wrongly hiding the setup checklist withholds the one
 * thing a new owner needs, while wrongly showing it is a small annoyance.
 *
 * The writer must `upsert`, not `update`: an `update` against a row that does
 * not exist yet reports success having written nothing — exactly the silent
 * failure this phase exists to remove.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { getOnboardingState } from '../onboardingQuery';
import {
  markTourCompleted,
  markChecklistDismissed,
} from '../onboardingService';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createServerSupabaseClient);
const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

interface ReadRecord {
  table?: string;
  select?: string;
  eq?: unknown[];
}

function mockRead(
  data: Record<string, unknown> | null,
  error: unknown = null,
): ReadRecord {
  const rec: ReadRecord = {};
  const supabase = {
    from: vi.fn((table: string) => {
      rec.table = table;
      return {
        select: vi.fn((cols: string) => {
          rec.select = cols;
          return {
            eq: vi.fn((col: string, value: unknown) => {
              rec.eq = [col, value];
              return {
                maybeSingle: vi.fn().mockResolvedValue({ data, error }),
              };
            }),
          };
        }),
      };
    }),
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
  return rec;
}

interface WriteRecord {
  table?: string;
  payload?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

function mockWrite(error: unknown = null): WriteRecord {
  const rec: WriteRecord = {};
  const supabase = {
    from: vi.fn((table: string) => {
      rec.table = table;
      return {
        upsert: vi.fn(
          (
            payload: Record<string, unknown>,
            options: Record<string, unknown>,
          ) => {
            rec.payload = payload;
            rec.options = options;
            return Promise.resolve({ error });
          },
        ),
      };
    }),
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
  return rec;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOnboardingState', () => {
  it('reads both markers from the one settings row, scoped to the shop', async () => {
    const rec = mockRead({
      onboarding_tour_completed_at: '2026-08-04T00:00:00Z',
      onboarding_checklist_dismissed_at: null,
    });

    await expect(
      getOnboardingState('11111111-1111-1111-1111-111111111111'),
    ).resolves.toEqual({
      tourCompleted: true,
      checklistDismissed: false,
      failed: false,
    });

    expect(rec.table).toBe('business_settings');
    expect(rec.select).toContain('onboarding_tour_completed_at');
    expect(rec.select).toContain('onboarding_checklist_dismissed_at');
    expect(rec.eq).toEqual([
      'business_id',
      '11111111-1111-1111-1111-111111111111',
    ]);
  });

  it('treats a missing settings row as "neither answered", not an error', async () => {
    // The row is created lazily on the owner's first save, so most shops have
    // none. `.single()` would raise PGRST116 here and fail every new dashboard.
    mockRead(null);

    await expect(
      getOnboardingState('22222222-2222-2222-2222-222222222222'),
    ).resolves.toEqual({
      tourCompleted: false,
      checklistDismissed: false,
      failed: false,
    });
  });

  it('shows the guidance when the read fails, and says the read failed', async () => {
    mockRead(null, { message: 'boom' });

    await expect(
      getOnboardingState('33333333-3333-3333-3333-333333333333'),
    ).resolves.toEqual({
      tourCompleted: false,
      checklistDismissed: false,
      failed: true,
    });
  });

  it('never throws, even when the client itself dies', async () => {
    mockedCreateClient.mockRejectedValue(new Error('no cookies'));

    await expect(
      getOnboardingState('44444444-4444-4444-4444-444444444444'),
    ).resolves.toEqual({
      tourCompleted: false,
      checklistDismissed: false,
      failed: true,
    });
  });

  // NOT tested: the `React.cache` dedupe between the layout and the page.
  // `cache` only memoises inside a React request scope, so outside a render it
  // is a passthrough — a unit test here would assert nothing and pass either
  // way, which is worse than the gap.
});

describe('onboarding writers', () => {
  it('upserts the tour marker, keyed on business_id', async () => {
    const rec = mockWrite();

    await expect(markTourCompleted(BUSINESS_ID)).resolves.toEqual({ ok: true });

    expect(rec.table).toBe('business_settings');
    expect(rec.options).toEqual({ onConflict: 'business_id' });
    expect(rec.payload?.business_id).toBe(BUSINESS_ID);
    expect(typeof rec.payload?.onboarding_tour_completed_at).toBe('string');
  });

  it('upserts the dismissal marker', async () => {
    const rec = mockWrite();

    await expect(markChecklistDismissed(BUSINESS_ID)).resolves.toEqual({
      ok: true,
    });
    expect(typeof rec.payload?.onboarding_checklist_dismissed_at).toBe(
      'string',
    );
  });

  it('writes only its own column, so other settings survive', async () => {
    // PostgREST's upsert touches exactly the payload's columns; sending hours
    // or contact details here would blank them on an existing row.
    const rec = mockWrite();
    await markTourCompleted(BUSINESS_ID);

    // `updated_at` is absent on purpose: it means "the owner changed a
    // setting", and hiding a card is not a settings change. The column defaults
    // to now() on insert and this table has no updated-at trigger.
    expect(Object.keys(rec.payload ?? {}).sort()).toEqual([
      'business_id',
      'onboarding_tour_completed_at',
    ]);
    expect(rec.payload).not.toHaveProperty('onboarding_checklist_dismissed_at');
  });

  it('reports a failed write instead of throwing at the page', async () => {
    mockWrite({ message: 'denied' });

    await expect(markTourCompleted(BUSINESS_ID)).resolves.toEqual({
      ok: false,
    });
  });

  it('survives a dead client', async () => {
    mockedCreateClient.mockRejectedValue(new Error('no cookies'));

    await expect(markChecklistDismissed(BUSINESS_ID)).resolves.toEqual({
      ok: false,
    });
  });
});
