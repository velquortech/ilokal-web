/**
 * Category-vertical divergence guard (`getCategoryDivergence`).
 *
 * The Add/Edit picker scopes categories to the business's vertical, and
 * `resolveCategoryInScope` enforces the same rule on write — so a divergent row
 * can only exist from legacy data or a business whose vertical changed after
 * its products were categorized. Either way the picker silently mis-scopes:
 * the guard's job is to report that state, not to fix it.
 *
 * Mocks `createServerSupabaseClient` with per-table chains, mirroring the
 * quotePricing suite's pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCategoryDivergence } from '@/lib/api/products/productQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BUSINESS_ID = '11111111-1111-1111-1111-111111111101';
const SERVICES_TYPE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HOME_TYPE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function buildClient(opts: {
  business?: { business_type_id: string | null };
  businessError?: { message: string } | null;
  typeName?: string | null;
  typeError?: { message: string } | null;
  products?: Array<{
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      business_type_id: string | null;
    } | null;
  }>;
  productsError?: { message: string } | null;
  typeNames?: Array<{ id: string; name: string }>;
  typeNamesError?: { message: string } | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === 'businesses') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.business ?? null,
              error: opts.businessError ?? null,
            }),
          }),
        }),
      };
    }
    if (table === 'business_types') {
      // Two call shapes: a single-name lookup (.maybeSingle) and the
      // id-list lookup that names the OTHER vertical (.in).
      return {
        select: vi.fn((cols: string) =>
          cols === 'id, name'
            ? {
                in: vi.fn().mockResolvedValue({
                  data: opts.typeNames ?? [],
                  error: opts.typeNamesError ?? null,
                }),
              }
            : {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: opts.typeName ? { name: opts.typeName } : null,
                    error: opts.typeError ?? null,
                  }),
                }),
              },
        ),
      };
    }
    if (table === 'products') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: opts.products ?? [],
                error: opts.productsError ?? null,
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from,
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
  return from;
}

const servicesCategory = {
  id: 'c1',
  name: 'Spa & Massage',
  business_type_id: SERVICES_TYPE,
};
const homeCategory = {
  id: 'c2',
  name: 'Home Services',
  business_type_id: HOME_TYPE,
};
const globalCategory = { id: 'c3', name: 'Other', business_type_id: null };

beforeEach(() => vi.clearAllMocks());

describe('getCategoryDivergence', () => {
  it('reports no divergence when every category is in scope', async () => {
    buildClient({
      business: { business_type_id: SERVICES_TYPE },
      typeName: 'Services',
      products: [
        { id: 'p1', name: 'Massage', category: servicesCategory },
        { id: 'p2', name: 'Misc', category: globalCategory },
        { id: 'p3', name: 'Uncategorized', category: null },
      ],
    });

    await expect(getCategoryDivergence(BUSINESS_ID)).resolves.toEqual({
      businessTypeId: SERVICES_TYPE,
      businessTypeName: 'Services',
      divergent: [],
      failed: false,
    });
  });

  it('flags a product categorized under a DIFFERENT vertical, naming it', async () => {
    buildClient({
      business: { business_type_id: SERVICES_TYPE },
      typeName: 'Services',
      products: [
        { id: 'p1', name: 'Massage', category: servicesCategory },
        { id: 'p2', name: 'Furniture Assembly', category: homeCategory },
      ],
      typeNames: [{ id: HOME_TYPE, name: 'Home & Property Services' }],
    });

    const report = await getCategoryDivergence(BUSINESS_ID);
    expect(report.failed).toBe(false);
    expect(report.divergent).toEqual([
      {
        productId: 'p2',
        productName: 'Furniture Assembly',
        categoryId: 'c2',
        categoryName: 'Home Services',
        categoryBusinessTypeId: HOME_TYPE,
        categoryBusinessTypeName: 'Home & Property Services',
      },
    ]);
  });

  it('treats a missing business vertical as unscoped: every non-global category diverges', async () => {
    buildClient({
      business: { business_type_id: null },
      typeName: null,
      products: [
        { id: 'p1', name: 'Massage', category: servicesCategory },
        { id: 'p2', name: 'Misc', category: globalCategory },
      ],
      typeNames: [{ id: SERVICES_TYPE, name: 'Services' }],
    });

    const report = await getCategoryDivergence(BUSINESS_ID);
    expect(report.businessTypeId).toBeNull();
    expect(report.businessTypeName).toBeNull();
    // Global stays in scope; the Services-category product diverges.
    expect(report.divergent.map((d) => d.productId)).toEqual(['p1']);
    expect(report.divergent[0].categoryBusinessTypeName).toBe('Services');
  });

  it('fails closed on a products read error — never "all clear"', async () => {
    buildClient({
      business: { business_type_id: SERVICES_TYPE },
      typeName: 'Services',
      productsError: { message: 'boom' },
    });

    await expect(getCategoryDivergence(BUSINESS_ID)).resolves.toEqual({
      businessTypeId: SERVICES_TYPE,
      businessTypeName: 'Services',
      divergent: [],
      failed: true,
    });
  });

  it('fails closed when the business itself cannot be read', async () => {
    buildClient({ businessError: { message: 'boom' } });

    const report = await getCategoryDivergence(BUSINESS_ID);
    expect(report.failed).toBe(true);
    expect(report.divergent).toEqual([]);
  });

  it('reports an empty catalogue as clean, not failed', async () => {
    buildClient({
      business: { business_type_id: SERVICES_TYPE },
      typeName: 'Services',
      products: [],
    });

    const report = await getCategoryDivergence(BUSINESS_ID);
    expect(report.failed).toBe(false);
    expect(report.divergent).toEqual([]);
    expect(report.businessTypeName).toBe('Services');
  });
});
