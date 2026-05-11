import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { updateCurrentUserProfileAction } from '@/app/(auth)/actions/userActions';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { updateUserProfile } from '@/lib/api/users/userService';

vi.mock('@/lib/utils/assertAuthorized', () => ({
  assertAuthorized: vi.fn(),
}));

vi.mock('@/lib/api/users/userService', () => ({
  updateUserProfile: vi.fn(),
}));

describe('updateCurrentUserProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error for invalid input', async () => {
    // full_name must be at least 2 chars to pass validation
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
    (updateUserProfile as unknown as Mock).mockRejectedValue(new Error('db'));

    const res = await updateCurrentUserProfileAction({ full_name: 'XY' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
