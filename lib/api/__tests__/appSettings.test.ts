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
  rows: { key: string; value: unknown }[] | null,
  error: { message: string } | null = null,
) {
  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: rows, error }),
      }),
    }),
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRegistrationSettings', () => {
  it('returns the stored boolean values', async () => {
    mockSettingsRows([
      { key: 'require_business_documents', value: false },
      { key: 'auto_verify_businesses', value: true },
    ]);

    await expect(getRegistrationSettings()).resolves.toEqual({
      requireBusinessDocuments: false,
      autoVerifyBusinesses: true,
    });
  });

  it('falls back to strict defaults when rows are missing', async () => {
    mockSettingsRows([]);

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
    mockSettingsRows([
      { key: 'require_business_documents', value: 'yes' },
      { key: 'auto_verify_businesses', value: true },
    ]);

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
  it('is ON when the row was never created', async () => {
    // Deliberately the opposite of the dark-shipped flags. The tour has no
    // server side and nothing to leak, so treating "never configured" as off
    // would ship a feature that only works once an admin finds a switch nobody
    // told them about.
    mockFlagRow(null);

    await expect(getOnboardingTourEnabled()).resolves.toBe(true);
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

  it('ignores a non-boolean stored value', async () => {
    mockFlagRow({ value: 'yes' });

    await expect(getOnboardingTourEnabled()).resolves.toBe(true);
  });
});
