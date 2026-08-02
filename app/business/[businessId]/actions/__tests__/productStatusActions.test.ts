/**
 * Product status actions.
 *
 * The row-action menu shipped `inactive`/`archived` — values `products.status`
 * cannot hold (the CHECK is `active|unlisted|disabled`, migration
 * `20260526000013`). The action passed them straight to PostgREST, so every
 * status change from the table came back as a generic INTERNAL_ERROR that the
 * UI then discarded. These tests pin both halves: the action rejects a status
 * outside the CHECK before touching the DB, and the pickers can only offer
 * statuses that exist.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as productService from '@/lib/api/products/productService';
import {
  productStatusSchema,
  MAX_BULK_STATUS_IDS,
} from '@/lib/validation/products';
import { PRODUCT_STATUSES, PRODUCT_STATUS_OPTIONS } from '@/lib/types';
import type { ProductStatus } from '@/lib/types';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/products/productService');

import {
  updateProductStatusAction,
  updateProductsStatusAction,
} from '../productActions';

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_ID = '550e8400-e29b-41d4-a716-446655440002';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  user: { id: 'user-1' },
};

function mockAuthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    authorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}

describe('status vocabulary', () => {
  it('mirrors the Zod enum, which mirrors the DB CHECK', () => {
    expect([...PRODUCT_STATUSES].sort()).toEqual(
      [...productStatusSchema.options].sort(),
    );
  });

  it('every picker option is a status the DB accepts', () => {
    for (const option of PRODUCT_STATUS_OPTIONS) {
      expect(productStatusSchema.safeParse(option.value).success).toBe(true);
      expect(option.label.length).toBeGreaterThan(0);
      // `unlisted` and `disabled` both hide the offering; without copy the
      // owner has no way to tell them apart.
      expect(option.description.length).toBeGreaterThan(0);
    }
  });

  it('offers every status exactly once', () => {
    const values = PRODUCT_STATUS_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual([...PRODUCT_STATUSES].sort());
  });
});

describe('status pickers do not hardcode values', () => {
  const ROOT = join(__dirname, '../../../../..');
  const PICKERS = [
    'app/business/[businessId]/product-catalogues/components/product-table/product-actions.tsx',
    'app/business/[businessId]/product-catalogues/components/product-table/bulk-status-actions.tsx',
    'app/business/[businessId]/product-catalogues/components/filter-products.tsx',
    'app/business/[businessId]/product-catalogues/components/update-product.tsx',
  ];

  it.each(PICKERS)('%s reads PRODUCT_STATUS_OPTIONS', (relative) => {
    expect(readFileSync(join(ROOT, relative), 'utf8')).toContain(
      'PRODUCT_STATUS_OPTIONS',
    );
  });

  it.each(PICKERS)('%s names no status outside the CHECK', (relative) => {
    const source = readFileSync(join(ROOT, relative), 'utf8');
    // The exact regression: a picker offering a value the CHECK rejects.
    for (const dead of ['inactive', 'archived']) {
      expect(source).not.toMatch(new RegExp(`value=["']${dead}["']`));
      expect(source).not.toMatch(new RegExp(`value:\\s*['"]${dead}['"]`));
    }
  });
});

describe('updateProductStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it.each(PRODUCT_STATUSES)('passes %s through to the service', async (s) => {
    vi.mocked(productService.updateProduct).mockResolvedValue({
      success: true,
      data: { id: PRODUCT_ID, status: s } as never,
    });

    const res = await updateProductStatusAction(PRODUCT_ID, s);

    expect(res.success).toBe(true);
    expect(productService.updateProduct).toHaveBeenCalledWith(
      PRODUCT_ID,
      BUSINESS_ID,
      { status: s },
    );
  });

  it.each(['inactive', 'archived', '', 'ACTIVE'])(
    'rejects %s without reaching the DB',
    async (bad) => {
      const res = await updateProductStatusAction(
        PRODUCT_ID,
        bad as ProductStatus,
      );

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
      expect(productService.updateProduct).not.toHaveBeenCalled();
      // Validation runs first, so a bad status is not even an auth question.
      expect(verifyBusinessOwner).not.toHaveBeenCalled();
    },
  );

  it('surfaces the authorization error unchanged', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValue({
      authorized: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    const res = await updateProductStatusAction(PRODUCT_ID, 'unlisted');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(productService.updateProduct).not.toHaveBeenCalled();
  });

  it('rejects a malformed id instead of letting PostgREST 22P02', async () => {
    const res = await updateProductStatusAction('not-a-uuid', 'unlisted');

    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(productService.updateProduct).not.toHaveBeenCalled();
  });
});

describe('updateProductsStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('updates the selection against the VERIFIED business id', async () => {
    vi.mocked(productService.updateProductsStatus).mockResolvedValue({
      success: true,
      data: { updated: 2 },
    });

    const res = await updateProductsStatusAction(
      [PRODUCT_ID, OTHER_ID],
      'unlisted',
    );

    expect(res.success).toBe(true);
    expect(res.data?.updated).toBe(2);
    expect(productService.updateProductsStatus).toHaveBeenCalledWith(
      [PRODUCT_ID, OTHER_ID],
      BUSINESS_ID,
      'unlisted',
    );
  });

  it('rejects an empty selection', async () => {
    const res = await updateProductsStatusAction([], 'active');
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(productService.updateProductsStatus).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid id rather than passing it to PostgREST', async () => {
    const res = await updateProductsStatusAction(['not-a-uuid'], 'active');
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(productService.updateProductsStatus).not.toHaveBeenCalled();
  });

  it('rejects a status outside the CHECK', async () => {
    const res = await updateProductsStatusAction(
      [PRODUCT_ID],
      'archived' as ProductStatus,
    );
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(productService.updateProductsStatus).not.toHaveBeenCalled();
  });

  it('caps the batch size', async () => {
    const ids = Array.from(
      { length: MAX_BULK_STATUS_IDS + 1 },
      (_, i) =>
        `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
    );
    const res = await updateProductsStatusAction(ids, 'active');
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(productService.updateProductsStatus).not.toHaveBeenCalled();
  });

  it('accepts a full page — the cap and the page-size ceiling agree', async () => {
    // If the catalogue's largest page ever exceeds the bulk cap, "select all
    // on this page" starts failing validation with no other symptom.
    const page = readFileSync(
      join(
        __dirname,
        '../../../../..',
        'app/business/[businessId]/product-catalogues/page.tsx',
      ),
      'utf8',
    );
    expect(page).toContain('MAX_BULK_STATUS_IDS');
    expect(page).not.toMatch(/Math\.min\(\s*\d+\s*,/);
  });
});

describe('per-user flood guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
    vi.mocked(productService.updateProductsStatus).mockResolvedValue({
      success: true,
      data: { updated: 1 },
    });
    vi.mocked(productService.updateProduct).mockResolvedValue({
      success: true,
      data: { id: PRODUCT_ID } as never,
    });
  });

  it('rate-limits a burst of status writes', async () => {
    // Server-Action POSTs never reach the proxy's limiter, and the bulk call
    // is a 50-row write amplifier — the budget has to live in the action.
    const results = [];
    for (let i = 0; i < 40; i++) {
      results.push(await updateProductStatusAction(PRODUCT_ID, 'unlisted'));
    }

    expect(results.some((r) => r.error?.code === 'RATE_LIMITED')).toBe(true);
    // The limiter runs AFTER auth, so an unauthorized caller can't consume a
    // legitimate owner's budget.
    expect(verifyBusinessOwner).toHaveBeenCalled();
  });
});
