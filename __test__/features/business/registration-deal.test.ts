/**
 * The optional launch deal (`.claude/REGISTRATION_MENU.md`, RM14/RM15).
 *
 * RM14 is the money hazard and most of this file is about it: a `published`
 * coupon inside its date window enters `mobile_deals` — the app's Deals front
 * page — and is immediately REDEEMABLE. That means a real `user_redemptions`
 * row, a real six-character cashier code, and a real notification to the
 * owner, for a discount a first-time owner may have clicked past. Nothing in
 * this chain may default that on.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registrationDealSchema,
  stepDealSchema,
} from '@/app/business/registration/validator/business-registration-form-schema';
import { getSteps } from '@/app/business/registration/data/steps';
import { getStepFieldGroups } from '@/app/business/registration/provider/registration-form-provider';

type CouponRow = {
  business_id: string;
  status: string;
  image_url: string | null;
  code: string;
  discount: {
    type: string;
    value: number | null;
    buy?: number;
    get?: number;
  };
  usage_scope: string;
  start_date: string;
  expiry_date: string;
  description: string | null;
};

const USER = { id: 'user-1' };
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

function makeSupabase(options?: {
  user?: { id: string } | null;
  business?: { id: string } | null;
  existingCoupon?: { id: string } | null;
}) {
  const inserted: CouponRow[] = [];
  const supabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options?.user === undefined ? USER : options.user },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'businesses') {
        const builder = {
          select: () => builder,
          eq: () => builder,
          is: () => builder,
          maybeSingle: async () => ({
            data:
              options?.business === undefined
                ? { id: BUSINESS_ID }
                : options.business,
            error: null,
          }),
        };
        return builder;
      }

      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        maybeSingle: async () => ({
          data: options?.existingCoupon ?? null,
          error: null,
        }),
        insert: async (row: CouponRow) => {
          inserted.push(row);
          return { error: null };
        },
      };
      return builder;
    }),
  };
  return { supabase, inserted };
}

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: mocks.createClient,
}));

const BASE_DEAL = {
  // Required by the schema so the negative cases below fail for the reason
  // they name, rather than for a missing uid.
  uid: 'deal-uid-1',
  code: 'OPENING20',
  description: 'Opening week',
  discount_type: 'percentage' as const,
  discount_value: 20,
  duration_days: 30,
  publish: false,
};

async function write(
  deal: Partial<Omit<typeof BASE_DEAL, 'discount_type' | 'discount_value'>> & {
    discount_type?: 'percentage' | 'fixed_amount' | 'free' | 'bogo';
    discount_value?: number | null;
    bogo_buy?: number;
    bogo_get?: number;
    image_url?: string | null;
  } = {},
  options?: Parameters<typeof makeSupabase>[0],
) {
  const { supabase, inserted } = makeSupabase(options);
  mocks.createClient.mockResolvedValue(supabase);
  const { createBusinessRegistrationDeal } =
    await import('@/lib/api/business/business');
  const result = await createBusinessRegistrationDeal(BUSINESS_ID, {
    ...BASE_DEAL,
    ...deal,
  });
  return { result, inserted, supabase };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RM14 — a deal is never published by accident', () => {
  it('writes a draft when the owner did not ask to publish', async () => {
    const { inserted } = await write({ publish: false });
    expect(inserted[0].status).toBe('draft');
  });

  it('publishes only when the owner explicitly said so', async () => {
    const { inserted } = await write({ publish: true });
    expect(inserted[0].status).toBe('published');
  });

  it('requires the publish flag to be stated, not inferred', () => {
    // If the schema tolerated an absent flag, "no opinion" would be decided by
    // whichever layer filled the gap — and the failure direction there is a
    // live discount nobody chose.
    const withoutPublish: Record<string, unknown> = { ...BASE_DEAL };
    delete withoutPublish.publish;
    expect(registrationDealSchema.safeParse(withoutPublish).success).toBe(
      false,
    );
  });
});

describe('the deal schema accepts the Phase 2 discount arms', () => {
  it('accepts a FREE deal with a null value', () => {
    const result = registrationDealSchema.safeParse({
      ...BASE_DEAL,
      discount_type: 'free',
      discount_value: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a BOGO deal with buy/get quantities', () => {
    const result = registrationDealSchema.safeParse({
      ...BASE_DEAL,
      discount_type: 'bogo',
      discount_value: null,
      bogo_buy: 1,
      bogo_get: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a BOGO deal missing the get quantity', () => {
    const result = registrationDealSchema.safeParse({
      ...BASE_DEAL,
      discount_type: 'bogo',
      discount_value: null,
      bogo_buy: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a percentage deal without a value', () => {
    const result = registrationDealSchema.safeParse({
      ...BASE_DEAL,
      discount_type: 'percentage',
      discount_value: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('RM15 — the step is genuinely optional', () => {
  it('accepts null as a complete answer', () => {
    expect(stepDealSchema.safeParse({ deal: null }).success).toBe(true);
  });

  it('rejects a half-filled deal rather than writing a broken one', () => {
    // Optional means "all or nothing". A code with no discount is not a
    // skipped step, it is an abandoned one, and writing it would put a
    // meaningless coupon on the owner's dashboard.
    expect(
      stepDealSchema.safeParse({ deal: { ...BASE_DEAL, discount_value: 0 } })
        .success,
    ).toBe(false);
    expect(
      stepDealSchema.safeParse({ deal: { ...BASE_DEAL, code: '' } }).success,
    ).toBe(false);
  });

  it('sits after the required menu step and before review', () => {
    // The order is the argument for why one is required and the other is not:
    // a shop with nothing to sell has nothing to discount.
    for (const requireDocuments of [true, false]) {
      const titles = getSteps(requireDocuments).map((s) => s.title);
      expect(titles.indexOf('A Launch Deal')).toBeGreaterThan(
        titles.indexOf('What You Offer'),
      );
      expect(titles.indexOf('A Launch Deal')).toBeLessThan(
        titles.indexOf('Review & Submit'),
      );
    }
  });

  it('registers a field group so the step validates what it shows', () => {
    for (const requireDocuments of [true, false]) {
      expect(getStepFieldGroups(requireDocuments).flat()).toContain('deal');
    }
  });
});

describe('what gets written', () => {
  it('normalises the code to uppercase', async () => {
    // Coupons are matched by code at the counter; a lowercase row would be a
    // code the cashier cannot find.
    const { inserted } = await write({ code: '  opening20 ' });
    expect(inserted[0].code).toBe('OPENING20');
  });

  it('opens the window now and closes it after the chosen run', async () => {
    const { inserted } = await write({ duration_days: 7 });
    const start = new Date(inserted[0].start_date).getTime();
    const end = new Date(inserted[0].expiry_date).getTime();
    expect(end - start).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('satisfies the coupon-access invariant when published', async () => {
    // Every route that shows or redeems a coupon filters
    // status='published' AND archived_at IS NULL AND start_date <= now.
    // A deal that fails any of those is one the owner believes is running and
    // no shopper can see.
    const { inserted } = await write({ publish: true });
    expect(inserted[0].status).toBe('published');
    expect(new Date(inserted[0].start_date).getTime()).toBeLessThanOrEqual(
      Date.now(),
    );
    expect(new Date(inserted[0].expiry_date).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('stores the discount in the JSONB shape the column expects', async () => {
    const { inserted } = await write({
      discount_type: 'fixed_amount',
      discount_value: 50,
    });
    expect(inserted[0].discount).toEqual({ type: 'fixed_amount', value: 50 });
  });

  it('stores a FREE deal as the free arm of the union', async () => {
    const { inserted } = await write({
      discount_type: 'free',
      discount_value: null,
    });
    expect(inserted[0].discount).toEqual({ type: 'free', value: null });
  });

  it('stores a BOGO deal as the bogo arm with buy/get', async () => {
    const { inserted } = await write({
      discount_type: 'bogo',
      discount_value: null,
      bogo_buy: 1,
      bogo_get: 1,
    });
    expect(inserted[0].discount).toEqual({
      type: 'bogo',
      buy: 1,
      get: 1,
      value: null,
    });
  });

  it('scopes the deal to the whole shop', async () => {
    // `specific_products` / `specific_categories` need scope_values, and there
    // is nothing sensible to scope to at registration.
    expect((await write()).inserted[0].usage_scope).toBe('any');
  });

  it('writes the verified business id', async () => {
    expect((await write()).inserted[0].business_id).toBe(BUSINESS_ID);
  });
});

describe('replaying the submission cannot duplicate the deal', () => {
  it('skips a code the business already has', async () => {
    const { inserted, result } = await write(
      {},
      { existingCoupon: { id: 'coupon-1' } },
    );
    expect(inserted).toHaveLength(0);
    expect(result).toEqual({ created: false });
  });
});

describe('the endpoint proves everything itself', () => {
  it('refuses an unauthenticated caller before touching coupons', async () => {
    const { supabase } = makeSupabase({ user: null });
    mocks.createClient.mockResolvedValue(supabase);
    const { createBusinessRegistrationDeal } =
      await import('@/lib/api/business/business');

    await expect(
      createBusinessRegistrationDeal(BUSINESS_ID, BASE_DEAL),
    ).rejects.toThrow('Unauthorized');
    expect(supabase.from).not.toHaveBeenCalledWith('coupons');
  });

  it('refuses a business the caller does not own', async () => {
    const { supabase } = makeSupabase({ business: null });
    mocks.createClient.mockResolvedValue(supabase);
    const { createBusinessRegistrationDeal } =
      await import('@/lib/api/business/business');

    await expect(
      createBusinessRegistrationDeal(BUSINESS_ID, BASE_DEAL),
    ).rejects.toThrow('Business not found');
    expect(supabase.from).not.toHaveBeenCalledWith('coupons');
  });
});

describe('discount bounds', () => {
  it('rejects a percentage over 100', () => {
    // Over 100% the shop pays the customer to shop there.
    expect(
      registrationDealSchema.safeParse({
        ...BASE_DEAL,
        discount_type: 'percentage',
        discount_value: 101,
      }).success,
    ).toBe(false);
  });

  it('allows a fixed amount over 100, which is just pesos', () => {
    expect(
      registrationDealSchema.safeParse({
        ...BASE_DEAL,
        discount_type: 'fixed_amount',
        discount_value: 500,
      }).success,
    ).toBe(true);
  });

  it('rejects a zero or negative discount', () => {
    for (const value of [0, -5]) {
      expect(
        registrationDealSchema.safeParse({
          ...BASE_DEAL,
          discount_value: value,
        }).success,
      ).toBe(false);
    }
  });
});

describe('the deal photo path is proved, not trusted', () => {
  const OTHER_BUSINESS = '22222222-2222-2222-2222-222222222222';

  it('stores a path under the verified business id', async () => {
    const { inserted } = await write({
      image_url: `${BUSINESS_ID}/offering-1-0.webp`,
    });
    expect(inserted[0].image_url).toBe(`${BUSINESS_ID}/offering-1-0.webp`);
  });

  it('refuses another shop’s path, an absolute URL and traversal', async () => {
    for (const value of [
      `${OTHER_BUSINESS}/x.webp`,
      'https://evil.example/x.webp',
      '//evil.example/x.webp',
      `${BUSINESS_ID}/../${OTHER_BUSINESS}/x.webp`,
      `${BUSINESS_ID}-evil/x.webp`,
    ]) {
      const { inserted } = await write({ image_url: value });
      expect(inserted[0].image_url).toBeNull();
    }
  });

  it('writes null when the owner attached no photo', async () => {
    // The card then falls back to the shop's logo and interior photo, which is
    // what every deal showed before the column existed.
    expect((await write()).inserted[0].image_url).toBeNull();
  });
});
