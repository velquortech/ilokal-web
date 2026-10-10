/**
 * An owner with two shops must see and change the shop in the URL — never
 * "whichever of their shops the database returns first".
 *
 * 🔴 The bug: branch, coupon and product actions called
 * `verifyBusinessOwner()` with NO argument, whose fallback was
 * `.eq('owner_id', user.id).limit(1)` — no ORDER BY, no relation to the route.
 * `/business/<shop B>/coupons` listed shop A's coupons under shop B's name, and
 * creating a coupon there filed it against shop A. Found in August by the live
 * E2E walkthrough (#25); its fix never merged.
 *
 * The per-file action tests cannot catch this: they mock `verifyBusinessOwner`
 * to return a fixed shop whatever it is asked, so they never see WHICH shop
 * was asked for. Here the mock answers for exactly the id it receives — a
 * no-argument call hands back no shop and the assertions fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as couponQuery from '@/lib/api/coupons/couponQuery';
import * as branchQuery from '@/lib/api/branches/branchQuery';
import * as productQuery from '@/lib/api/products/productQuery';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/coupons/couponQuery');
vi.mock('@/lib/api/branches/branchQuery');
vi.mock('@/lib/api/products/productQuery');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getBusinessCouponsPaginatedAction } from '../couponActions';
import { getBusinessBranchesAction } from '../branchActions';
import { getBusinessProductsAction } from '../productActions';

// The owner's two shops. B is the one in the URL; A is what `.limit(1)` used
// to return.
const SHOP_A = '11111111-1111-4111-8111-111111111111';
const SHOP_B = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  // Authorizes exactly the shop it is asked about, as the real helper does.
  vi.mocked(verifyBusinessOwner).mockImplementation(
    async (businessId?: string) =>
      ({
        authorized: true,
        user: { id: 'owner-of-both' },
        business: businessId ? { id: businessId } : undefined,
      }) as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
  vi.mocked(couponQuery.getCouponsPaginated).mockResolvedValue({
    coupons: [],
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  } as never);
  vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValue({
    branches: [],
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 0,
  } as never);
  vi.mocked(productQuery.getProductsByBusinessId).mockResolvedValue({
    products: [],
  } as never);
});

describe('dashboard actions act on the shop in the URL', () => {
  it('coupons: authorizes and lists shop B, not shop A', async () => {
    await getBusinessCouponsPaginatedAction(SHOP_B, {});
    expect(verifyBusinessOwner).toHaveBeenCalledWith(SHOP_B);
    expect(couponQuery.getCouponsPaginated).toHaveBeenCalledWith(
      SHOP_B,
      expect.anything(),
    );
  });

  it('branches: authorizes and lists shop B, not shop A', async () => {
    await getBusinessBranchesAction(SHOP_B, {});
    expect(verifyBusinessOwner).toHaveBeenCalledWith(SHOP_B);
    expect(branchQuery.getBranchesByBusinessId).toHaveBeenCalledWith(
      SHOP_B,
      expect.anything(),
    );
  });

  it('products: authorizes and lists shop B, not shop A', async () => {
    await getBusinessProductsAction(SHOP_B);
    expect(verifyBusinessOwner).toHaveBeenCalledWith(SHOP_B);
    expect(productQuery.getProductsByBusinessId).toHaveBeenCalledWith(SHOP_B);
  });

  it('never consults any other shop of the owner', async () => {
    await getBusinessCouponsPaginatedAction(SHOP_B, {});
    await getBusinessBranchesAction(SHOP_B, {});
    await getBusinessProductsAction(SHOP_B);
    const asked = vi.mocked(verifyBusinessOwner).mock.calls.map((c) => c[0]);
    expect(asked).not.toContain(SHOP_A);
    expect(asked.every((id) => id === SHOP_B)).toBe(true);
  });
});

/**
 * The guard against a quiet reintroduction: no code may ask for "the owner's
 * shop" without saying which. `verifyBusinessOwner`'s `businessId` is a
 * required parameter, so TypeScript already rejects `verifyBusinessOwner()` —
 * this catches the casts and `undefined`s that would get around it.
 */
describe('no caller asks for "any shop of this owner"', () => {
  const ROOT = process.cwd();
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (name === 'node_modules' || name === '__tests__') return [];
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)
        ? [path]
        : [];
    });
  }

  it('finds no verifyBusinessOwner() call without a shop id', () => {
    const offenders = ['app', 'lib', 'components']
      .flatMap((d) => sourceFiles(join(ROOT, d)))
      .filter((file) =>
        /verifyBusinessOwner\(\s*(\)|undefined\b|null\b|''|"")/.test(
          stripComments(readFileSync(file, 'utf8')),
        ),
      )
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
