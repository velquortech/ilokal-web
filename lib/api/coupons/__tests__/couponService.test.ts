import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as q from '@/lib/api/coupons/couponQuery';
import * as svc from '@/lib/api/coupons/couponService';
import { createServerSupabaseClient } from '@/supabase/server';
import type { Mock } from 'vitest';

vi.mock('@/lib/api/coupons/couponQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('couponService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const defaultClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null, data: null })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValue(
      defaultClient,
    );
  });

  it('createCoupon returns INTERNAL_ERROR when insert fails', async () => {
    const supabaseClient = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: null,
              error: { message: 'db' },
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.createCoupon({
      code: 'X',
      discount: 10,
    } as unknown as Parameters<typeof svc.createCoupon>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('updateCoupon returns NOT_FOUND when coupon missing', async () => {
    vi.mocked(q.couponExists).mockResolvedValueOnce(
      false as unknown as Awaited<ReturnType<typeof q.couponExists>>,
    );
    const res = await svc.updateCoupon('c1', {
      discount: 5,
    } as unknown as Parameters<typeof svc.updateCoupon>[1]);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('deleteCoupon succeeds when coupon exists and archive works', async () => {
    vi.mocked(q.couponExists).mockResolvedValueOnce(
      true as unknown as Awaited<ReturnType<typeof q.couponExists>>,
    );
    const supabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await svc.deleteCoupon('c1');
    expect(res.success).toBe(true);
  });
});
