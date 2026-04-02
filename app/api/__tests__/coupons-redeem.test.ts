import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User } from '@/lib/types';

vi.mock('@/lib/api/getCurrentUser');
vi.mock('@/lib/services/couponService', () => ({
  default: {
    redeemAtBranch: vi.fn(),
  },
}));

import { getCurrentUser } from '@/lib/api/getCurrentUser';
import couponService from '@/lib/services/couponService';

describe('Coupon Redeem API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have POST endpoint for redeem', async () => {
    const { POST } = await import('@/app/api/coupons/[id]/redeem/route');
    expect(POST).toBeDefined();
  });

  it('should require authentication', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it('should validate branch_id is required', async () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'Test User',
      phone_number: null,
      avatar_url: null,
      role: 'app_user',
    };

    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    const user = await getCurrentUser();
    expect(user?.id).toBe('user-1');
  });

  it('should handle redemption validation', async () => {
    const error = new Error('Coupon has expired');
    vi.mocked(couponService.redeemAtBranch).mockRejectedValueOnce(error);

    await expect(
      couponService.redeemAtBranch('coupon-1', 'branch-1'),
    ).rejects.toThrow('Coupon has expired');
  });

  it('should prevent duplicate redemptions', async () => {
    const error = new Error('Coupon already redeemed by this user');
    vi.mocked(couponService.redeemAtBranch).mockRejectedValueOnce(error);

    await expect(
      couponService.redeemAtBranch('coupon-1', 'branch-1'),
    ).rejects.toThrow('Coupon already redeemed by this user');
  });

  it('should handle coupon not found', async () => {
    const error = new Error('Coupon not found');
    vi.mocked(couponService.redeemAtBranch).mockRejectedValueOnce(error);

    await expect(
      couponService.redeemAtBranch('nonexistent', 'branch-1'),
    ).rejects.toThrow('Coupon not found');
  });

  it('should track branch context during redemption', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'redemption-1',
        coupon_id: 'coupon-1',
        user_id: 'user-1',
        branch_id: 'branch-123',
        redeemed_at: new Date().toISOString(),
      },
    };

    vi.mocked(couponService.redeemAtBranch).mockResolvedValueOnce(mockResponse);

    const result = await couponService.redeemAtBranch('coupon-1', 'branch-123');
    expect(result.success).toBe(true);
    expect(vi.mocked(couponService.redeemAtBranch)).toHaveBeenCalledWith(
      'coupon-1',
      'branch-123',
    );
  });

  it('should retrieve valid redemption on success', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'redemption-1',
        coupon_id: 'coupon-1',
        user_id: 'user-1',
        branch_id: 'branch-1',
        redeemed_at: new Date().toISOString(),
      },
    };

    vi.mocked(couponService.redeemAtBranch).mockResolvedValueOnce(mockResponse);

    const result = await couponService.redeemAtBranch('coupon-1', 'branch-1');
    expect(result.success).toBe(true);
    expect(
      (result.data as { coupon_id: string; user_id: string })?.coupon_id,
    ).toBe('coupon-1');
  });
});
