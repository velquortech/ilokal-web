/**
 * Quote-based pricing (`price_type: 'on_request'`) and the service/rental
 * attribute rules — asserted at BOTH gates that guard them:
 *
 *   1. Zod (`lib/validation/products.ts`) — readable messages for the form.
 *   2. `createProduct` / `applySale` — the Server-Action path, which is what a
 *      direct caller hits.
 *
 * The DB CHECKs are the final gate and are covered in
 * `supabase/tests/offerings_discriminators.test.sql`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
} from '@/lib/validation/products';

describe('createProductSchema — quote pricing', () => {
  const base = { name: 'Custom Event Package' };

  it('accepts a quote-based offering with no price', () => {
    const result = createProductSchema.safeParse({
      ...base,
      price_type: 'on_request',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a quote-based offering that carries a price', () => {
    const result = createProductSchema.safeParse({
      ...base,
      price_type: 'on_request',
      price: 3500,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/cannot carry a price/i);
    expect(result.error?.issues[0].path).toEqual(['price']);
  });

  it('rejects a sale on a quote-based offering', () => {
    const result = createProductSchema.safeParse({
      ...base,
      price_type: 'on_request',
      sale_price: 100,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/cannot go on sale/i);
  });

  it('still requires a price for every other price type', () => {
    for (const price_type of ['fixed', 'per_hour', 'per_day', 'from']) {
      const result = createProductSchema.safeParse({ ...base, price_type });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/price is required/i);
    }
  });

  it('accepts a normal priced offering unchanged', () => {
    expect(
      createProductSchema.safeParse({
        ...base,
        price: 185,
        price_type: 'fixed',
      }).success,
    ).toBe(true);
  });
});

describe('createProductSchema — service/rental attributes', () => {
  const base = { name: 'Van Hire', price: 3500, price_type: 'per_day' };

  it('accepts a van-rental shaped payload', () => {
    const result = createProductSchema.safeParse({
      ...base,
      kind: 'service',
      booking_mode: 'date_range',
      inventory_count: 3,
      capacity: 12,
      deposit_amount: 2000,
      min_duration_units: 1,
      max_duration_units: 14,
      service_location: 'both',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a max duration below the min', () => {
    const result = createProductSchema.safeParse({
      ...base,
      min_duration_units: 5,
      max_duration_units: 2,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['max_duration_units']);
  });

  it('allows an open-ended range (only one bound set)', () => {
    expect(
      createProductSchema.safeParse({ ...base, min_duration_units: 3 }).success,
    ).toBe(true);
    expect(
      createProductSchema.safeParse({ ...base, max_duration_units: 3 }).success,
    ).toBe(true);
  });

  it('rejects negative inventory and non-positive capacity', () => {
    expect(
      createProductSchema.safeParse({ ...base, inventory_count: -1 }).success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({ ...base, capacity: 0 }).success,
    ).toBe(false);
  });

  it('allows zero inventory (fully booked out), but not zero duration', () => {
    expect(
      createProductSchema.safeParse({ ...base, inventory_count: 0 }).success,
    ).toBe(true);
    expect(
      createProductSchema.safeParse({ ...base, duration_minutes: 0 }).success,
    ).toBe(false);
  });

  it('rejects an unknown booking mode or service location', () => {
    expect(
      createProductSchema.safeParse({ ...base, booking_mode: 'calendar' })
        .success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({ ...base, service_location: 'anywhere' })
        .success,
    ).toBe(false);
  });
});

describe('updateProductSchema — quote pricing', () => {
  it('allows a partial update that touches neither price nor type', () => {
    expect(updateProductSchema.safeParse({ name: 'Renamed' }).success).toBe(
      true,
    );
  });

  it('rejects explicitly nulling the price without switching to on_request', () => {
    const result = updateProductSchema.safeParse({
      price: null,
      price_type: 'fixed',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/price is required/i);
  });

  it('allows switching an offering to quote-based', () => {
    expect(
      updateProductSchema.safeParse({ price_type: 'on_request' }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Service layer — the same rules on the Server-Action path.
// ---------------------------------------------------------------------------

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/api/products/productQuery', () => ({
  getCategoryById: vi.fn(),
  getProductById: vi.fn(),
  applySaleToProduct: vi.fn(),
}));

import { createProduct, applySale } from '@/lib/api/products/productService';
import * as productQuery from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111104';

function mockInsert() {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
  };
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from: vi.fn().mockReturnValue(chain),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

describe('createProduct — quote pricing guards', () => {
  it('writes a NULL price for a quote-based offering', async () => {
    const chain = mockInsert();

    const result = await createProduct(BUSINESS_ID, {
      name: 'Custom Event Package',
      price_type: 'on_request',
    });

    expect(result.success).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ price: null, price_type: 'on_request' }),
    );
  });

  it('rejects a missing price for a normal price type before touching the DB', async () => {
    const chain = mockInsert();

    const result = await createProduct(BUSINESS_ID, {
      name: 'Priceless Widget',
      price_type: 'fixed',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('rejects a price on a quote-based offering', async () => {
    const chain = mockInsert();

    const result = await createProduct(BUSINESS_ID, {
      name: 'Custom Event Package',
      price_type: 'on_request',
      price: 3500,
    });

    expect(result.success).toBe(false);
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it('persists kind and the service attributes it is given', async () => {
    const chain = mockInsert();

    await createProduct(BUSINESS_ID, {
      name: 'Van Hire',
      price: 3500,
      price_type: 'per_day',
      kind: 'service',
      booking_mode: 'date_range',
      inventory_count: 3,
      capacity: 12,
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'service',
        booking_mode: 'date_range',
        inventory_count: 3,
        capacity: 12,
      }),
    );
  });

  it('omits attribute keys it was not given, leaving DB defaults intact', async () => {
    const chain = mockInsert();

    await createProduct(BUSINESS_ID, {
      name: 'Flat White',
      price: 185,
      price_type: 'fixed',
    });

    const payload = chain.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('kind');
    expect(payload).not.toHaveProperty('booking_mode');
    expect(payload).not.toHaveProperty('inventory_count');
  });
});

describe('applySale — quote pricing guard', () => {
  it('refuses to discount an offering priced on request', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    );
    vi.mocked(productQuery.getProductById).mockResolvedValue({
      product: {
        id: 'p1',
        business_id: BUSINESS_ID,
        price: null,
        price_type: 'on_request',
      },
    } as unknown as Awaited<ReturnType<typeof productQuery.getProductById>>);

    const result = await applySale('p1', BUSINESS_ID, { sale_price: 100 });

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/priced on request/i);
    expect(productQuery.applySaleToProduct).not.toHaveBeenCalled();
  });
});
