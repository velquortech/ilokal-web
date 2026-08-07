/**
 * The registration menu step's write path (`.claude/REGISTRATION_MENU.md`,
 * RM2/RM3/RM4/RM12).
 *
 * These are the four ways this can be wrong without anything visibly failing:
 * the same menu written twice by a retry, a services business minting
 * products, items written `unlisted` so the public page stays empty while the
 * step reports success, and a stranger writing into someone else's shop.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  offeringModeForVerticalName,
  defaultKindForMode,
} from '@/lib/types/offering';
import {
  registrationOfferingSchema,
  stepOfferingsSchema,
} from '@/app/business/registration/validator/business-registration-form-schema';
import { MAX_REGISTRATION_OFFERINGS } from '@/lib/validation/products';

type ProductRow = {
  business_id: string;
  name: string;
  price: number | null;
  price_type: string;
  status: string;
  kind: string;
  image_url: string | null;
};

const USER = { id: 'user-1' };
const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

/** Captures what the write path actually sends to PostgREST. */
function makeSupabase(options?: {
  user?: { id: string } | null;
  business?: { id: string } | null;
  existingNames?: string[];
}) {
  const inserted: ProductRow[][] = [];
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

      // products: either the existing-names read or the insert
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: async () => ({
          data: (options?.existingNames ?? []).map((name) => ({ name })),
          error: null,
        }),
        insert: async (rows: ProductRow[]) => {
          inserted.push(rows);
          return { error: null, count: rows.length };
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

async function write(
  offerings: { name: string; price: number | null; on_request: boolean }[],
  kind: 'product' | 'service' = 'product',
  options?: Parameters<typeof makeSupabase>[0],
) {
  const { supabase, inserted } = makeSupabase(options);
  mocks.createClient.mockResolvedValue(supabase);
  const { createBusinessRegistrationOfferings } =
    await import('@/lib/api/business/business');
  const result = await createBusinessRegistrationOfferings(
    BUSINESS_ID,
    offerings,
    kind,
  );
  return { result, inserted, supabase };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RM4 — items are written so a shopper can actually see them', () => {
  it('creates every row as active', async () => {
    const { inserted } = await write([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(inserted[0][0].status).toBe('active');
  });

  it('never writes a status that would leave the page empty', async () => {
    // `unlisted` and `disabled` both set is_available = false via
    // sync_product_availability, so either would satisfy this step, leave the
    // public page blank, AND still earn the owner a "you have no menu" email —
    // both the setup checklist and admin_businesses_missing_menu count only
    // `active`.
    const { inserted } = await write([
      { name: 'Adobo', price: 120, on_request: false },
      { name: 'Sinigang', price: 150, on_request: false },
    ]);
    for (const row of inserted[0]) {
      expect(['unlisted', 'disabled']).not.toContain(row.status);
    }
  });
});

describe('RM3 — kind follows the vertical, not the column default', () => {
  it('mirrors the DB trigger for each seeded vertical', () => {
    // sync_business_type_id (20260727000000) keys on the vertical NAME.
    expect(offeringModeForVerticalName('Services')).toBe('services');
    expect(offeringModeForVerticalName('Tourism & Leisure')).toBe('both');
    expect(offeringModeForVerticalName('Retail')).toBe('products');
    expect(offeringModeForVerticalName('Food & Beverage')).toBe('products');
  });

  it('falls back to products for a vertical the trigger would not match', () => {
    // The trigger's CASE leaves the column default in place, which is
    // 'products'. A custom category has no vertical at all.
    expect(offeringModeForVerticalName(undefined)).toBe('products');
    expect(offeringModeForVerticalName(null)).toBe('products');
    expect(offeringModeForVerticalName('Something An Admin Renamed')).toBe(
      'products',
    );
  });

  it('writes services for a services vertical', async () => {
    const kind = defaultKindForMode(offeringModeForVerticalName('Services'));
    expect(kind).toBe('service');

    const { inserted } = await write(
      [{ name: 'Fumigation', price: null, on_request: true }],
      kind,
    );
    expect(inserted[0][0].kind).toBe('service');
  });

  it('always sends kind explicitly', async () => {
    // The DB cannot tell an omitted field from a deliberate 'product', so an
    // absent key silently types a salon's service menu as products.
    const { inserted } = await write([
      { name: 'Flat White', price: 185, on_request: false },
    ]);
    expect(inserted[0][0]).toHaveProperty('kind');
  });
});

describe('RM2 — writing the same menu twice cannot double it', () => {
  it('skips names the business already has', async () => {
    // The client replays its whole submission after a 404 and can be
    // re-submitted after a mid-flight failure, so this call must be safe to
    // repeat.
    const { inserted, result } = await write(
      [
        { name: 'Adobo', price: 120, on_request: false },
        { name: 'Sinigang', price: 150, on_request: false },
      ],
      'product',
      { existingNames: ['Adobo'] },
    );
    expect(inserted[0].map((row) => row.name)).toEqual(['Sinigang']);
    expect(result).toEqual({ created: 1 });
  });

  it('matches names case- and whitespace-insensitively', async () => {
    const { inserted } = await write(
      [{ name: '  adobo  ', price: 120, on_request: false }],
      'product',
      { existingNames: ['Adobo'] },
    );
    expect(inserted).toHaveLength(0);
  });

  it('does not insert at all when everything is already there', async () => {
    const { inserted, result } = await write(
      [{ name: 'Adobo', price: 120, on_request: false }],
      'product',
      { existingNames: ['Adobo'] },
    );
    // Not an empty INSERT — no request at all.
    expect(inserted).toHaveLength(0);
    expect(result).toEqual({ created: 0 });
  });

  it('dedupes within a single batch too', async () => {
    const { inserted } = await write([
      { name: 'Adobo', price: 120, on_request: false },
      { name: 'ADOBO', price: 130, on_request: false },
    ]);
    expect(inserted[0]).toHaveLength(1);
  });
});

describe('RM12 — the endpoint proves everything itself', () => {
  it('refuses an unauthenticated caller before touching products', async () => {
    const { supabase } = makeSupabase({ user: null });
    mocks.createClient.mockResolvedValue(supabase);
    const { createBusinessRegistrationOfferings } =
      await import('@/lib/api/business/business');

    await expect(
      createBusinessRegistrationOfferings(
        BUSINESS_ID,
        [{ name: 'Adobo', price: 120, on_request: false }],
        'product',
      ),
    ).rejects.toThrow('Unauthorized');
    expect(supabase.from).not.toHaveBeenCalledWith('products');
  });

  it('refuses a business the caller does not own', async () => {
    // The ownership read is scoped by owner_id, so a shop belonging to someone
    // else comes back as no row — indistinguishable from "does not exist",
    // which is the right thing to tell the caller either way.
    const { supabase } = makeSupabase({ business: null });
    mocks.createClient.mockResolvedValue(supabase);
    const { createBusinessRegistrationOfferings } =
      await import('@/lib/api/business/business');

    await expect(
      createBusinessRegistrationOfferings(
        BUSINESS_ID,
        [{ name: 'Adobo', price: 120, on_request: false }],
        'product',
      ),
    ).rejects.toThrow('Business not found');
    expect(supabase.from).not.toHaveBeenCalledWith('products');
  });

  it('writes the verified id, never the caller-supplied string', async () => {
    const { inserted } = await write([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(inserted[0][0].business_id).toBe(BUSINESS_ID);
  });

  it('caps the batch even if the client sends more', async () => {
    const many = Array.from(
      { length: MAX_REGISTRATION_OFFERINGS + 10 },
      (_, i) => ({
        name: `Item ${i}`,
        price: 10,
        on_request: false,
      }),
    );
    const { inserted } = await write(many);
    expect(inserted[0]).toHaveLength(MAX_REGISTRATION_OFFERINGS);
  });
});

describe('price and the quote escape hatch', () => {
  it('stores a quoted item as NULL price with the on_request type', async () => {
    // The DB CHECK is `price_type = 'on_request' OR price IS NOT NULL`, so any
    // other pairing would be rejected by the database rather than stored.
    const { inserted } = await write([
      { name: 'Site visit', price: null, on_request: true },
    ]);
    expect(inserted[0][0]).toMatchObject({
      price: null,
      price_type: 'on_request',
    });
  });

  it('drops a stale price when the item is marked quote-based', async () => {
    const { inserted } = await write([
      { name: 'Site visit', price: 500, on_request: true },
    ]);
    expect(inserted[0][0].price).toBeNull();
  });
});

describe('the step schema', () => {
  it('requires at least one item', () => {
    const result = stepOfferingsSchema.safeParse({ offerings: [] });
    expect(result.success).toBe(false);
  });

  it('accepts exactly one', () => {
    expect(
      stepOfferingsSchema.safeParse({
        offerings: [
          { uid: 'u1', name: 'Adobo', price: 120, on_request: false },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects more than the shared cap', () => {
    const tooMany = Array.from(
      { length: MAX_REGISTRATION_OFFERINGS + 1 },
      (_, i) => ({
        uid: `u${i}`,
        name: `Item ${i}`,
        price: 1,
        on_request: false,
      }),
    );
    expect(stepOfferingsSchema.safeParse({ offerings: tooMany }).success).toBe(
      false,
    );
  });

  it('rejects a priced item with no price', () => {
    expect(
      registrationOfferingSchema.safeParse({
        uid: 'u1',
        name: 'Adobo',
        price: null,
        on_request: false,
      }).success,
    ).toBe(false);
  });

  it('allows a null price only when quoted', () => {
    expect(
      registrationOfferingSchema.safeParse({
        uid: 'u1',
        name: 'Site visit',
        price: null,
        on_request: true,
      }).success,
    ).toBe(true);
  });

  it('rejects a blank name', () => {
    expect(
      registrationOfferingSchema.safeParse({
        uid: 'u1',
        name: '   ',
        price: 10,
        on_request: false,
      }).success,
    ).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(
      registrationOfferingSchema.safeParse({
        uid: 'u1',
        name: 'Adobo',
        price: -1,
        on_request: false,
      }).success,
    ).toBe(false);
  });
});

describe('IMG9/IMG10 — the image path is proved, not trusted', () => {
  const OTHER_BUSINESS = '22222222-2222-2222-2222-222222222222';

  it('stores a path under the verified business id', async () => {
    const { inserted } = await write([
      {
        name: 'Adobo',
        price: 120,
        on_request: false,
        image_url: `${BUSINESS_ID}/offering-1-0.webp`,
      },
    ]);
    expect(inserted[0][0].image_url).toBe(`${BUSINESS_ID}/offering-1-0.webp`);
  });

  it('refuses a path belonging to another shop', async () => {
    // The bucket is PUBLIC-READ, so accepting this would let any caller point
    // their own row at another shop's photo — a real cross-shop read, not a
    // theoretical one. The client sends this value back, so it cannot be
    // trusted just because this app produced the original.
    const { inserted } = await write([
      {
        name: 'Adobo',
        price: 120,
        on_request: false,
        image_url: `${OTHER_BUSINESS}/offering-1-0.webp`,
      },
    ]);
    expect(inserted[0][0].image_url).toBeNull();
  });

  it('refuses an absolute URL', async () => {
    // IMG10 — a column holding both raw paths and absolute URLs is what made
    // the gallery diff match nothing and delete live files.
    for (const value of [
      'https://evil.example/x.webp',
      '//evil.example/x.webp',
      `http://localhost:54321/storage/v1/object/public/product-images/${BUSINESS_ID}/x.webp`,
    ]) {
      const { inserted } = await write([
        { name: 'Adobo', price: 120, on_request: false, image_url: value },
      ]);
      expect(inserted[0][0].image_url).toBeNull();
    }
  });

  it('refuses a traversal-shaped path', async () => {
    const { inserted } = await write([
      {
        name: 'Adobo',
        price: 120,
        on_request: false,
        image_url: `${BUSINESS_ID}/../${OTHER_BUSINESS}/x.webp`,
      },
    ]);
    expect(inserted[0][0].image_url).toBeNull();
  });

  it('refuses a business id that merely starts the same', async () => {
    // Prefix matching without the slash would accept `<id>-evil/...`.
    const { inserted } = await write([
      {
        name: 'Adobo',
        price: 120,
        on_request: false,
        image_url: `${BUSINESS_ID}-evil/x.webp`,
      },
    ]);
    expect(inserted[0][0].image_url).toBeNull();
  });

  it('writes null when no photo was attached', async () => {
    const { inserted } = await write([
      { name: 'Adobo', price: 120, on_request: false },
    ]);
    expect(inserted[0][0].image_url).toBeNull();
  });
});
