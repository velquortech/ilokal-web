import { describe, expect, it } from 'vitest';
import {
  buildDiscount,
  buildPromoRequest,
  getPromoTemplate,
  promoDefaults,
  templateChanges,
  templateForDiscount,
} from '../promo-templates';
import {
  promoFormSchema,
  type PromoFormValues,
} from '@/lib/validation/promoForm';
import type { Coupon } from '@/lib/types';

function values(overrides: Partial<PromoFormValues> = {}): PromoFormValues {
  return {
    promotion_type: 'coupon',
    status: 'draft',
    template: 'custom',
    code: 'TEST',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    bogo_buy: undefined,
    bogo_get: undefined,
    usage_scope: 'any',
    scope_values: [],
    start_date: '2026-08-14T09:00',
    expiry_date: '2026-09-14T09:00',
    max_redemptions_global: '',
    max_redemptions_per_user: '',
    ...overrides,
  };
}

describe('buildDiscount', () => {
  it('builds percentage', () => {
    expect(buildDiscount(values({ discount_type: 'percentage' }))).toEqual({
      type: 'percentage',
      value: 10,
    });
  });

  it('builds fixed_amount', () => {
    expect(
      buildDiscount(
        values({ discount_type: 'fixed_amount', discount_value: 50 }),
      ),
    ).toEqual({ type: 'fixed_amount', value: 50 });
  });

  it('builds free', () => {
    expect(buildDiscount(values({ discount_type: 'free' }))).toEqual({
      type: 'free',
      value: null,
    });
  });

  it('builds bogo with buy/get', () => {
    expect(
      buildDiscount(
        values({
          discount_type: 'bogo',
          discount_value: undefined,
          bogo_buy: 2,
          bogo_get: 1,
        }),
      ),
    ).toEqual({ type: 'bogo', buy: 2, get: 1, value: null });
  });
});

describe('buildPromoRequest', () => {
  it('maps the flat form onto the API shape', () => {
    const req = buildPromoRequest(
      values({
        code: '  summer10  ',
        description: '  hello  ',
        max_redemptions_global: '50',
        scope_values: ['a', 'b'],
      }),
      { imageUrl: 'shop/photo.webp', branchId: 'branch-1' },
    );

    expect(req.code).toBe('SUMMER10');
    expect(req.description).toBe('hello');
    expect(req.discount).toEqual({ type: 'percentage', value: 10 });
    expect(req.scope_values).toEqual(['a', 'b']);
    expect(req.max_redemptions_global).toBe(50);
    expect(req.max_redemptions_per_user).toBeUndefined();
    expect(req.image_url).toBe('shop/photo.webp');
    expect(req.branch_id).toBe('branch-1');
    expect(new Date(req.start_date).toString()).not.toBe('Invalid Date');
  });

  it('omits empty scope and caps', () => {
    const req = buildPromoRequest(values());
    expect(req.scope_values).toBeUndefined();
    expect(req.max_redemptions_global).toBeUndefined();
  });

  it('sends the default caps as real numbers', () => {
    const req = buildPromoRequest(promoDefaults(null));
    expect(req.max_redemptions_global).toBe(100);
    expect(req.max_redemptions_per_user).toBe(3);
  });
});

describe('templateForDiscount', () => {
  it('maps an exact preset', () => {
    expect(templateForDiscount({ type: 'percentage', value: 10 })).toBe(
      'pct10',
    );
    expect(templateForDiscount({ type: 'free', value: null })).toBe('free');
    expect(
      templateForDiscount({ type: 'bogo', buy: 1, get: 1, value: null }),
    ).toBe('bogo');
  });

  it('maps a non-preset value to custom', () => {
    expect(templateForDiscount({ type: 'percentage', value: 7 })).toBe(
      'custom',
    );
  });
});

describe('templateChanges', () => {
  const blank = { code: '', start_date: '', expiry_date: '' };

  it('prefills 10% off: type, value, code suggestion, and dates', () => {
    const tpl = getPromoTemplate('pct10')!;
    const { updates, nextSuggestion } = templateChanges(tpl, blank, '');
    expect(updates.discount_type).toBe('percentage');
    expect(updates.discount_value).toBe(10);
    expect(updates.code).toBe('10OFF');
    expect(updates.start_date).toBeTruthy();
    expect(updates.expiry_date).toBeTruthy();
    expect(nextSuggestion).toBe('10OFF');
  });

  it('switches BOGO: sets buy/get and clears the stale value', () => {
    const tpl = getPromoTemplate('bogo')!;
    const { updates } = templateChanges(
      tpl,
      { code: '10OFF', start_date: '', expiry_date: '' },
      '10OFF',
    );
    expect(updates.discount_type).toBe('bogo');
    expect(updates.bogo_buy).toBe(1);
    expect(updates.bogo_get).toBe(1);
    expect(updates.discount_value).toBeUndefined();
    expect(updates.code).toBe('B1T1'); // code still equals the last suggestion
  });

  it('never clobbers a hand-typed code', () => {
    const tpl = getPromoTemplate('pct5')!;
    const { updates } = templateChanges(
      tpl,
      { code: 'MYDEAL', start_date: '', expiry_date: '' },
      '10OFF',
    );
    expect(updates.code).toBeUndefined();
  });

  it('custom changes nothing', () => {
    const tpl = getPromoTemplate('custom')!;
    const { updates } = templateChanges(tpl, blank, '');
    expect(updates).toEqual({});
  });
});

describe('promoDefaults', () => {
  it('fills fresh dates so a preset is never date-blocked', () => {
    const d = promoDefaults(null);
    expect(d.start_date).toBeTruthy();
    expect(d.expiry_date).toBeTruthy();
    expect(new Date(d.expiry_date) > new Date(d.start_date)).toBe(true);
  });

  it('defaults redemption caps for a new promo — 100 total, 3 per customer', () => {
    const d = promoDefaults(null);
    expect(d.max_redemptions_global).toBe('100');
    expect(d.max_redemptions_per_user).toBe('3');
  });

  it('reads and writes dates as Manila, never the device zone', () => {
    // 2026-08-14T00:00Z is 08:00 in Manila — the prefill must show 08:00
    // wherever this test machine sits, and saving it must land back on the
    // same instant. Device-local getters used to show 19:00 (previous day)
    // west of UTC.
    const coupon = {
      promotion_type: 'coupon',
      status: 'draft',
      code: 'MANILA',
      discount: null,
      usage_scope: 'any',
      start_date: '2026-08-14T00:00:00.000Z',
      expiry_date: '2026-09-14T00:00:00.000Z',
    } as unknown as Coupon;

    const d = promoDefaults(coupon);
    expect(d.start_date).toBe('2026-08-14T08:00');
    expect(d.expiry_date).toBe('2026-09-14T08:00');

    const req = buildPromoRequest(
      values({ start_date: d.start_date, expiry_date: d.expiry_date }),
    );
    expect(req.start_date).toBe('2026-08-14T00:00:00.000Z');
    expect(req.expiry_date).toBe('2026-09-14T00:00:00.000Z');
  });

  it('prefills a BOGO coupon for edit', () => {
    const coupon = {
      promotion_type: 'deal',
      status: 'published',
      code: 'B1T1',
      description: null,
      discount: { type: 'bogo', buy: 1, get: 2, value: null },
      usage_scope: 'any',
      start_date: '2026-08-14T00:00:00.000Z',
      expiry_date: '2026-09-14T00:00:00.000Z',
      max_redemptions_global: null,
      max_redemptions_per_user: null,
    } as unknown as Coupon;

    const d = promoDefaults(coupon);
    expect(d.discount_type).toBe('bogo');
    expect(d.bogo_buy).toBe(1);
    expect(d.bogo_get).toBe(2);
    expect(d.template).toBe('bogo');
    expect(d.promotion_type).toBe('deal');
    expect(d.status).toBe('published');
    // A coupon with NO caps prefills empty — unlimited is the row's truth,
    // and the fresh-form defaults must never leak into edit mode.
    expect(d.max_redemptions_global).toBe('');
    expect(d.max_redemptions_per_user).toBe('');
  });

  it('prefills a capped coupon for edit with its real values', () => {
    const coupon = {
      promotion_type: 'coupon',
      status: 'draft',
      code: 'CAPPED',
      discount: null,
      usage_scope: 'any',
      start_date: '2026-08-14T00:00:00.000Z',
      expiry_date: '2026-09-14T00:00:00.000Z',
      max_redemptions_global: 50,
      max_redemptions_per_user: 2,
    } as unknown as Coupon;

    const d = promoDefaults(coupon);
    expect(d.max_redemptions_global).toBe('50');
    expect(d.max_redemptions_per_user).toBe('2');
  });
});

describe('promoFormSchema', () => {
  it('accepts a BOGO promo with both quantities', () => {
    const result = promoFormSchema.safeParse(
      values({
        discount_type: 'bogo',
        discount_value: undefined,
        bogo_buy: 1,
        bogo_get: 1,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects a BOGO promo missing the get quantity', () => {
    const result = promoFormSchema.safeParse(
      values({ discount_type: 'bogo', discount_value: undefined, bogo_buy: 1 }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects a percentage over 100', () => {
    const result = promoFormSchema.safeParse(values({ discount_value: 150 }));
    expect(result.success).toBe(false);
  });
});
