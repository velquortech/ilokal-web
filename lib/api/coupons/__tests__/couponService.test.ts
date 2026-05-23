import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as q from '@/lib/api/coupons/couponQuery';
import * as svc from '@/lib/api/coupons/couponService';
import { createServerSupabaseClient } from '@/supabase/server';
import type { Mock } from 'vitest';
import type { Coupon } from '@/lib/types';

vi.mock('@/lib/api/coupons/couponQuery');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const COUPON_ID = 'cou-00000000-0000-0000-0000-000000000001';

const baseInput = {
  code: 'SAVE10',
  discount: { type: 'percentage' as const, value: 10 },
  usage_scope: 'any' as const,
  start_date: new Date().toISOString(),
  expiry_date: new Date(Date.now() + 86400000).toISOString(),
};

function makeInsertChain(returnValue: {
  data: Coupon | null;
  error: { message: string } | null;
}) {
  const single = vi.fn().mockResolvedValue(returnValue);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return { from, insert, select, single };
}

function makeUpdateChain(returnValue: {
  data: Coupon | null;
  error: { message: string } | null;
}) {
  const single = vi.fn().mockResolvedValue(returnValue);
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { from, update, eq, select, single };
}

function makeArchiveChain(returnValue: { error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(returnValue);
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { from, update, eq };
}

describe('couponService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== createCoupon =====

  describe('createCoupon()', () => {
    it('inserts with draft status by default', async () => {
      const mockCoupon: Partial<Coupon> = {
        id: COUPON_ID,
        code: 'SAVE10',
        status: 'draft',
      };
      const chain = makeInsertChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.createCoupon(BUSINESS_ID, baseInput);

      expect(res.success).toBe(true);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
      );
    });

    it('inserts with published status when specified', async () => {
      const mockCoupon: Partial<Coupon> = {
        id: COUPON_ID,
        code: 'SAVE10',
        status: 'published',
      };
      const chain = makeInsertChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.createCoupon(BUSINESS_ID, {
        ...baseInput,
        status: 'published',
      });

      expect(res.success).toBe(true);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
      );
    });

    it('returns INTERNAL_ERROR when insert fails', async () => {
      const chain = makeInsertChain({
        data: null,
        error: { message: 'db error' },
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.createCoupon(BUSINESS_ID, baseInput);

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });

    it('uppercases the coupon code on insert', async () => {
      const mockCoupon: Partial<Coupon> = {
        id: COUPON_ID,
        code: 'SAVE10',
        status: 'draft',
      };
      const chain = makeInsertChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.createCoupon(BUSINESS_ID, { ...baseInput, code: 'save10' });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SAVE10' }),
      );
    });
  });

  // ===== updateCoupon =====

  describe('updateCoupon()', () => {
    it('returns NOT_FOUND when coupon does not exist', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(false);

      const res = await svc.updateCoupon(COUPON_ID, { status: 'published' });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('persists status field when publishing a draft coupon', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const mockCoupon: Partial<Coupon> = {
        id: COUPON_ID,
        status: 'published',
      };
      const chain = makeUpdateChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.updateCoupon(COUPON_ID, { status: 'published' });

      expect(res.success).toBe(true);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
      );
    });

    it('persists status field when unpublishing to draft', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const mockCoupon: Partial<Coupon> = { id: COUPON_ID, status: 'draft' };
      const chain = makeUpdateChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.updateCoupon(COUPON_ID, { status: 'draft' });

      expect(res.success).toBe(true);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' }),
      );
    });

    it('returns INTERNAL_ERROR when update query fails', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const chain = makeUpdateChain({
        data: null,
        error: { message: 'db error' },
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.updateCoupon(COUPON_ID, { status: 'published' });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });

    it('does not include status in update payload when not provided', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const mockCoupon: Partial<Coupon> = { id: COUPON_ID, code: 'NEW10' };
      const chain = makeUpdateChain({
        data: mockCoupon as Coupon,
        error: null,
      });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      await svc.updateCoupon(COUPON_ID, { code: 'NEW10' });

      expect(chain.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.anything() }),
      );
    });
  });

  // ===== deleteCoupon =====

  describe('deleteCoupon()', () => {
    it('returns NOT_FOUND when coupon does not exist', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(false);

      const res = await svc.deleteCoupon(COUPON_ID);

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('NOT_FOUND');
    });

    it('soft-deletes a published coupon successfully', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const chain = makeArchiveChain({ error: null });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.deleteCoupon(COUPON_ID);

      expect(res.success).toBe(true);
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ archived_at: expect.any(String) }),
      );
    });

    it('soft-deletes a draft coupon successfully', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const chain = makeArchiveChain({ error: null });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.deleteCoupon(COUPON_ID);

      expect(res.success).toBe(true);
    });

    it('returns INTERNAL_ERROR when archive query fails', async () => {
      vi.mocked(q.couponExists).mockResolvedValueOnce(true);
      const chain = makeArchiveChain({ error: { message: 'db error' } });
      (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
        from: chain.from,
      } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);

      const res = await svc.deleteCoupon(COUPON_ID);

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INTERNAL_ERROR');
    });
  });
});
