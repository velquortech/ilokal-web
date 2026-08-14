import { describe, expect, it } from 'vitest';
import {
  discountValueSchema,
  createCouponSchema,
} from '@/lib/validation/coupons';

describe('discountValueSchema (BOGO/FREE data model)', () => {
  it('accepts a percentage discount', () => {
    const result = discountValueSchema.safeParse({
      type: 'percentage',
      value: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a percentage above 100', () => {
    const result = discountValueSchema.safeParse({
      type: 'percentage',
      value: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a percentage without a value', () => {
    const result = discountValueSchema.safeParse({ type: 'percentage' });
    expect(result.success).toBe(false);
  });

  it('accepts a fixed amount discount', () => {
    const result = discountValueSchema.safeParse({
      type: 'fixed_amount',
      value: 50,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a FREE promo', () => {
    const result = discountValueSchema.safeParse({ type: 'free', value: null });
    expect(result.success).toBe(true);
  });

  it('accepts a Buy 1 Get 1 promo', () => {
    const result = discountValueSchema.safeParse({
      type: 'bogo',
      buy: 1,
      get: 1,
      value: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a BOGO with a max_free cap', () => {
    const result = discountValueSchema.safeParse({
      type: 'bogo',
      buy: 2,
      get: 1,
      max_free: 3,
      value: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a BOGO missing the get quantity', () => {
    const result = discountValueSchema.safeParse({
      type: 'bogo',
      buy: 1,
      value: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a BOGO with a zero buy quantity', () => {
    const result = discountValueSchema.safeParse({
      type: 'bogo',
      buy: 0,
      get: 1,
      value: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown discount type', () => {
    const result = discountValueSchema.safeParse({ type: 'bundle', value: 10 });
    expect(result.success).toBe(false);
  });
});

describe('createCouponSchema with the widened union', () => {
  const base = {
    code: 'B1T1',
    usage_scope: 'any',
    start_date: '2026-08-14T00:00:00.000Z',
    expiry_date: '2026-09-14T00:00:00.000Z',
  } as const;

  it('accepts a BOGO coupon end to end', () => {
    const result = createCouponSchema.safeParse({
      ...base,
      discount: { type: 'bogo', buy: 1, get: 1, value: null },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a FREE coupon end to end', () => {
    const result = createCouponSchema.safeParse({
      ...base,
      discount: { type: 'free', value: null },
    });
    expect(result.success).toBe(true);
  });

  it('keeps accepting the legacy percentage shape', () => {
    const result = createCouponSchema.safeParse({
      ...base,
      discount: { type: 'percentage', value: 20 },
    });
    expect(result.success).toBe(true);
  });
});
