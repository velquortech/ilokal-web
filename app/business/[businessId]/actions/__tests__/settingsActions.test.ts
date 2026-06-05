import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BusinessSettings, NotificationPreferences } from '@/lib/types';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
  createServerAdminClient: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/config/routeConfig', () => ({
  businessSettingsPath: (id: string) => `/business/${id}/settings`,
}));
vi.mock('@/lib/api/settings/settingsQuery', () => ({
  upsertBusinessSettings: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import * as settingsQuery from '@/lib/api/settings/settingsQuery';
import {
  changePasswordAction,
  changeEmailAction,
  upsertBusinessSettingsAction,
  updateNotificationPreferencesAction,
  deactivateBusinessAction,
} from '../settingsActions';

const BID = 'biz-00000000-0000-0000-0000-000000000001';
const UID = 'user-0000-0000-0000-000000000001';

const authorized = {
  authorized: true as const,
  user: { id: UID },
  business: { id: BID },
};
const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

const mockSettings: BusinessSettings = {
  business_id: BID,
  operating_hours: null,
  social_links: null,
  contact_website: null,
  contact_phone_public: null,
  allow_reviews: true,
  coupon_default_expiry_days: 30,
};

const mockPrefs: NotificationPreferences = {
  user_id: UID,
  email: false,
  push: false,
  digest: 'weekly',
};

function makeSupabaseClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: UID, email: 'owner@test.com' } },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      ...overrides.auth,
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ error: null }),
      ...((overrides.from as object) ?? {}),
    }),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

// ── changePasswordAction ──────────────────────────────────────────────────────

describe('changePasswordAction', () => {
  it('returns error when not authorized', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(unauthorized);
    const result = await changePasswordAction(BID, {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns VALIDATION_ERROR for weak new password', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await changePasswordAction(BID, {
      currentPassword: 'OldPass1',
      newPassword: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when passwords do not match', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await changePasswordAction(BID, {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns INVALID_CREDENTIALS when current password is wrong', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const client = makeSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: UID, email: 'owner@test.com' } },
        }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ error: { message: 'Invalid credentials' } }),
      },
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      client,
    );
    const result = await changePasswordAction(BID, {
      currentPassword: 'WrongPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns success when current password is correct and new password is valid', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeSupabaseClient(),
    );
    const result = await changePasswordAction(BID, {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1',
    });
    expect(result.success).toBe(true);
  });
});

// ── changeEmailAction ─────────────────────────────────────────────────────────

describe('changeEmailAction', () => {
  it('returns VALIDATION_ERROR for invalid email', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await changeEmailAction(BID, {
      newEmail: 'not-an-email',
      password: 'Pass1word',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns INVALID_CREDENTIALS when password is wrong', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const client = makeSupabaseClient({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: UID, email: 'owner@test.com' } },
        }),
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ error: { message: 'Wrong password' } }),
        updateUser: vi.fn(),
      },
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      client,
    );
    const result = await changeEmailAction(BID, {
      newEmail: 'new@email.com',
      password: 'WrongPass1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns success and triggers Supabase confirmation email', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      makeSupabaseClient(),
    );
    const result = await changeEmailAction(BID, {
      newEmail: 'new@email.com',
      password: 'OldPass1',
    });
    expect(result.success).toBe(true);
  });
});

// ── upsertBusinessSettingsAction ──────────────────────────────────────────────

describe('upsertBusinessSettingsAction', () => {
  it('returns error when not authorized', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(unauthorized);
    const result = await upsertBusinessSettingsAction(BID, {});
    expect(result.success).toBe(false);
  });

  it('returns saved settings on success', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    vi.mocked(settingsQuery.upsertBusinessSettings).mockResolvedValueOnce(
      mockSettings,
    );
    const result = await upsertBusinessSettingsAction(BID, {
      allow_reviews: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSettings);
    expect(revalidatePath).toHaveBeenCalledWith(`/business/${BID}/settings`);
  });

  it('returns DB_ERROR when query throws', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    vi.mocked(settingsQuery.upsertBusinessSettings).mockRejectedValueOnce(
      new Error('Write failed'),
    );
    const result = await upsertBusinessSettingsAction(BID, {});
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DB_ERROR');
  });
});

// ── updateNotificationPreferencesAction ──────────────────────────────────────

describe('updateNotificationPreferencesAction', () => {
  it('returns VALIDATION_ERROR for invalid digest value', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await updateNotificationPreferencesAction(BID, {
      email: true,
      push: false,
      digest: 'hourly' as 'daily',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns saved preferences on success', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    vi.mocked(
      settingsQuery.upsertNotificationPreferences,
    ).mockResolvedValueOnce(mockPrefs);
    const result = await updateNotificationPreferencesAction(BID, {
      email: false,
      push: false,
      digest: 'weekly',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPrefs);
  });
});

// ── deactivateBusinessAction ──────────────────────────────────────────────────

describe('deactivateBusinessAction', () => {
  it('returns VALIDATION_ERROR when confirmation is wrong', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const result = await deactivateBusinessAction(BID, {
      confirmation: 'WRONG' as 'DEACTIVATE',
    });
    expect(result.success).toBe(false);
  });

  it('updates businesses.status to suspended on correct confirmation', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn().mockReturnValue({ update: updateMock, eq: eqMock }),
    });
    const result = await deactivateBusinessAction(BID, {
      confirmation: 'DEACTIVATE',
    });
    expect(result.success).toBe(true);
  });

  it('returns DB_ERROR when update fails', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValueOnce(authorized);
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'DB down' } });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi
        .fn()
        .mockReturnValue({ update: vi.fn().mockReturnThis(), eq: eqMock }),
    });
    const result = await deactivateBusinessAction(BID, {
      confirmation: 'DEACTIVATE',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DB_ERROR');
  });
});
