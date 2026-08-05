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
) {
  // Through the RPC, not a table read: `app_settings` is readable TO
  // authenticated only, so a table read answers an ANONYMOUS caller with zero
  // rows and no error — which the old implementation turned into the strict
  // fallbacks on a public page. See 20260805090000.
  const supabase = {
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
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
  it('returns the stored boolean values', async () => {
    mockSettingsRows({
      require_business_documents: false,
      auto_verify_businesses: true,
    });

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: false,
      autoVerifyBusinesses: true,
    });
  });

  it('falls back to strict defaults when rows are missing', async () => {
    mockSettingsRows(null);

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true,
      autoVerifyBusinesses: false,
    });
  });

  it('falls back to strict defaults on query error', async () => {
    mockSettingsRows(null, { message: 'boom' });

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true,
      autoVerifyBusinesses: false,
    });
  });

  it('ignores non-boolean values per key', async () => {
    mockSettingsRows({
      require_business_documents: 'yes',
      auto_verify_businesses: true,
    });

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: true, // fallback — 'yes' is not boolean
      autoVerifyBusinesses: true,
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
