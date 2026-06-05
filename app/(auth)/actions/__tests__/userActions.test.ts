import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { updateCurrentUserProfileAction } from '@/app/(auth)/actions/userActions';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { updateUserProfile } from '@/lib/api/users/userService';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/utils/assertAuthorized', () => ({
  assertAuthorized: vi.fn(),
}));

vi.mock('@/lib/api/users/userService', () => ({
  updateUserProfile: vi.fn(),
}));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Builds a minimal chainable supabase mock that resolves .single() with `data`
function makeSupabaseMock(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  const client = { from: vi.fn().mockReturnValue(chain) };
  (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);
  return client;
}

describe('updateCurrentUserProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error for invalid input', async () => {
    const res = await updateCurrentUserProfileAction({
      full_name: 'X',
    } as never);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns authentication error when not authorized', async () => {
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: false,
    });
    const res = await updateCurrentUserProfileAction({ full_name: 'XY' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHENTICATION_ERROR');
  });

  it('updates profile when authorized and input valid', async () => {
    const mockUser = { id: 'u1', email: 'u@e.com', full_name: 'U1' };
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: true,
      user: { id: 'u1' },
      profile: mockUser,
    });
    makeSupabaseMock({ avatar_url: null });
    (updateUserProfile as unknown as Mock).mockResolvedValue({
      ...mockUser,
      full_name: 'Updated',
    });

    const res = await updateCurrentUserProfileAction({ full_name: 'Updated' });
    expect(res.success).toBe(true);
    expect(res.data?.full_name).toBe('Updated');
  });

  it('returns internal error when service throws', async () => {
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: true,
      user: { id: 'u1' },
    });
    makeSupabaseMock({ avatar_url: null });
    (updateUserProfile as unknown as Mock).mockRejectedValue(new Error('db'));

    const res = await updateCurrentUserProfileAction({ full_name: 'XY' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('deletes old avatar from storage when avatar_url changes', async () => {
    const mockUser = { id: 'u1', email: 'u@e.com', full_name: 'U1' };
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: true,
      user: { id: 'u1' },
      profile: mockUser,
    });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq']) chain[m] = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({
      data: {
        avatar_url:
          'https://proj.supabase.co/storage/v1/object/public/avatars/u1/old.png',
      },
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(chain),
      storage: { from: vi.fn().mockReturnValue({ remove: removeMock }) },
    };
    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);
    (updateUserProfile as unknown as Mock).mockResolvedValue({
      ...mockUser,
      avatar_url:
        'https://proj.supabase.co/storage/v1/object/public/avatars/u1/new.png',
    });

    await updateCurrentUserProfileAction({
      avatar_url:
        'https://proj.supabase.co/storage/v1/object/public/avatars/u1/new.png',
    });

    // Give fire-and-forget a tick to execute
    await new Promise((r) => setTimeout(r, 0));
    expect(removeMock).toHaveBeenCalledWith(['u1/old.png']);
  });
});
