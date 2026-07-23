/**
 * getRegistrationSettings: reads the two flags from app_settings and falls
 * back to the strict legacy behavior (docs required, no auto-verify) on
 * missing rows or query errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRegistrationSettings } from '../appSettings';
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
