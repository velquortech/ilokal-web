/**
 * updateRegistrationSettingAction: admin guard, key allowlist, and the
 * app_settings upsert payload.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateRegistrationSettingAction } from '../settingsActions';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/admin/adminActionHelpers', () => ({
  verifyCurrentUserIsAdmin: vi.fn(),
}));
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

const mockedVerify = vi.mocked(verifyCurrentUserIsAdmin);
const mockedCreateClient = vi.mocked(createServerSupabaseClient);

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';

function makeSupabase(upsertError: { message: string } | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const from = vi.fn().mockReturnValue({ upsert });
  const supabase = {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: ADMIN_ID } } }),
    },
  };
  mockedCreateClient.mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
  return { upsert, from };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedVerify.mockResolvedValue({ authorized: true });
});

describe('updateRegistrationSettingAction', () => {
  it('rejects non-admin callers without touching the DB', async () => {
    mockedVerify.mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });
    const { upsert } = makeSupabase();

    const result = await updateRegistrationSettingAction(
      'auto_verify_businesses',
      true,
    );

    expect(result.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects keys outside the allowlist', async () => {
    const { upsert } = makeSupabase();

    const result = await updateRegistrationSettingAction(
      'some_other_key' as never,
      true,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid setting');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts the setting with the caller as updated_by', async () => {
    const { upsert, from } = makeSupabase();

    const result = await updateRegistrationSettingAction(
      'require_business_documents',
      true,
    );

    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalledWith('app_settings');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'require_business_documents',
        value: true,
        updated_by: ADMIN_ID,
      }),
    );
  });

  it('returns a generic error when the upsert fails (no raw leak)', async () => {
    makeSupabase({ message: 'duplicate key value violates constraint xyz' });

    const result = await updateRegistrationSettingAction(
      'auto_verify_businesses',
      false,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update setting');
  });
});
