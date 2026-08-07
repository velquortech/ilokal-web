/**
 * getRegistrationSettings: reads the two flags from app_settings and falls
 * back to the strict legacy behavior (docs required, no auto-verify) on
 * missing rows or query errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRegistrationSettings,
  getOnboardingTourEnabled,
} from '../appSettings';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createServerSupabaseClient);

function mockSettingsRows(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null,
  /** The table read the RPC path falls back to (pre-migration deploys). */
  tableRows: { key: string; value: unknown }[] | null = null,
) {
  // Through the RPC, not a table read: `app_settings` is readable TO
  // authenticated only, so a table read answers an ANONYMOUS caller with zero
  // rows and no error — which the old implementation turned into the strict
  // fallbacks on a public page. See 20260805090000.
  const supabase = {
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
    }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: tableRows, error: null }),
      }),
    }),
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRegistrationSettings', () => {
  it('returns the stored boolean values, read through the RPC', async () => {
    const supabase = mockSettingsRows({
      require_business_documents: false,
      auto_verify_businesses: true,
    });

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: false,
      autoVerifyBusinesses: true,
    });
    // Named explicitly: a typo'd RPC would otherwise pass by falling through
    // to the fallbacks, which is the failure this change was chasing.
    expect(supabase.rpc).toHaveBeenCalledWith('public_feature_flags');
  });

  it('falls back to strict defaults when rows are missing', async () => {
    mockSettingsRows(null);

    // `failed` rides along so a caller that uses a flag to decide whether a
    // surface is meaningful can tell "an admin configured this" from "we
    // could not read it". The two flag VALUES stay strict either way.
    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true,
      autoVerifyBusinesses: false,
      failed: true,
    });
  });

  it('falls back to strict defaults on query error', async () => {
    mockSettingsRows(null, { message: 'boom' });

    // `failed` rides along so a caller that uses a flag to decide whether a
    // surface is meaningful can tell "an admin configured this" from "we
    // could not read it". The two flag VALUES stay strict either way.
    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true,
      autoVerifyBusinesses: false,
      failed: true,
    });
  });

  it('falls back to the table when the RPC predates the migration', async () => {
    // 20260805090000 added the two registration keys. Deployed BEFORE it
    // lands, the older function still resolves successfully without them —
    // and reading that as "not configured" would regress the authenticated
    // flows that worked via the table read: the wizard would grow a Documents
    // step, the success dialog would promise a review again.
    const supabase = mockSettingsRows(
      { enable_events: true, enable_bookings: false },
      null,
      [
        { key: 'require_business_documents', value: false },
        { key: 'auto_verify_businesses', value: true },
      ],
    );

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: false,
      autoVerifyBusinesses: true,
    });
    expect(supabase.from).toHaveBeenCalledWith('app_settings');
  });

  it('stays strict when neither source can answer', async () => {
    // The anonymous, pre-migration case: the old RPC has no registration keys
    // and the table is invisible to this caller.
    mockSettingsRows({ enable_events: true, enable_bookings: false }, null, []);

    // No `failed` here: both reads SUCCEEDED, they just carried no rows. That
    // is "not configured", which the strict defaults are the right answer to —
    // distinct from "we could not read it", which is what `failed` marks.
    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true,
      autoVerifyBusinesses: false,
    });
  });

  it('ignores a non-boolean value from either source', async () => {
    mockSettingsRows(
      { require_business_documents: 'yes', auto_verify_businesses: true },
      null,
      [{ key: 'require_business_documents', value: 'yes' }],
    );

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true, // fallback — 'yes' is not boolean
      autoVerifyBusinesses: false,
    });
  });
});

function mockFlagRow(
  row: { value: unknown } | null,
  error: { message: string } | null = null,
) {
  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
        }),
      }),
    }),
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
}

describe('getOnboardingTourEnabled', () => {
  it('fails closed when no row is visible', async () => {
    // The row is seeded true by 20260804233000, so "absent" means either the
    // migration has not landed or the caller cannot read `app_settings` (it is
    // readable TO authenticated only — an anon caller gets zero rows and NO
    // error). Answering `true` there would silently defeat an admin's OFF
    // switch, which is the trap that moved `readFlag` onto the RPC.
    mockFlagRow(null);

    await expect(getOnboardingTourEnabled()).resolves.toBe(false);
  });

  it('honours an admin turning it off', async () => {
    mockFlagRow({ value: false });

    await expect(getOnboardingTourEnabled()).resolves.toBe(false);
  });

  it('honours an admin turning it back on', async () => {
    mockFlagRow({ value: true });

    await expect(getOnboardingTourEnabled()).resolves.toBe(true);
  });

  it('fails closed on a read error', async () => {
    // An overlay painted over the dashboard is the one failure worth being
    // timid about — and switching it off without a deploy is what this flag
    // is for.
    mockFlagRow(null, { message: 'boom' });

    await expect(getOnboardingTourEnabled()).resolves.toBe(false);
  });

  it('fails closed when the client itself throws', async () => {
    mockedCreateClient.mockRejectedValue(new Error('no cookies'));

    await expect(getOnboardingTourEnabled()).resolves.toBe(false);
  });

  it('accepts only a real boolean true', async () => {
    // A truthy string is a mis-seeded row, not consent.
    mockFlagRow({ value: 'yes' });

    await expect(getOnboardingTourEnabled()).resolves.toBe(false);
  });
});
