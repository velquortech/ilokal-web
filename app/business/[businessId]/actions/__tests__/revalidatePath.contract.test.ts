import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every business action must revalidate through a routeConfig helper, never a
 * hand-written path.
 *
 * The routes are DYNAMIC (`/business/[businessId]/coupons`), so a literal like
 * `revalidatePath('/business/coupons')` names a page that does not exist and
 * silently revalidates nothing — the coupon actions shipped exactly that, and
 * the client's `router.refresh()` masked it until the owner hit a stale page
 * they couldn't navigate to. Every other action family revalidates through a
 * `businessXxxPath(businessId)` helper, which is one source of truth for the
 * route shape.
 *
 * A source-scan because a wrong literal renders fine: the failure is an ABSENT
 * revalidation, which no render test observes.
 *
 * Comments are stripped first — the comments in these files quote the very
 * path that was removed (that is what makes them worth reading), and a sweep
 * that fails on its own explanation teaches people to delete the explanation.
 */

const ACTIONS_DIR = join(process.cwd(), 'app/business/[businessId]/actions');

/**
 * The routeConfig helpers a revalidate may pass. One source of truth for the
 * list: any helper added to `config/routeConfig.ts` for a business page must
 * be added here or the sweep rejects it.
 */
const REVALIDATE_HELPERS = [
  'businessPath(',
  'businessProfilePath(',
  'businessShopPath(',
  'businessShopGalleryPath(',
  'businessCouponsPath(',
  'businessEventsPath(',
  'businessBranchesPath(',
  'businessProductCataloguesPath(',
  'businessSettingsPath(',
];

/** Comments stripped — see the module doc. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** `revalidatePath(<first argument>` — the argument, up to its first `)`. */
const REVALIDATE_CALL = /revalidatePath\(\s*([^)]*)\)/g;

describe('business actions revalidate through routeConfig helpers', () => {
  const files = readdirSync(ACTIONS_DIR)
    .filter((file) => file.endsWith('.ts'))
    .sort();

  it('guards the whole actions folder', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('finds at least one revalidatePath to guard (the sweep is not vacuous)', () => {
    const total = files.reduce((count, file) => {
      const source = code(readFileSync(join(ACTIONS_DIR, file), 'utf8'));
      return count + (source.match(REVALIDATE_CALL) ?? []).length;
    }, 0);
    expect(total).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file, () => {
      const source = code(readFileSync(join(ACTIONS_DIR, file), 'utf8'));
      const args = [...source.matchAll(REVALIDATE_CALL)].map((match) =>
        match[1].trim(),
      );

      it('never passes a hand-written path', () => {
        // A string or template literal as the first argument means the caller
        // hard-coded the route shape instead of asking routeConfig.
        for (const arg of args) {
          expect(
            arg,
            `hand-written path in ${file}: revalidatePath(${arg}…)`,
          ).not.toMatch(/^['"`]/);
        }
      });

      it('passes a routeConfig path helper', () => {
        for (const arg of args) {
          expect(
            REVALIDATE_HELPERS.some((helper) => arg.startsWith(helper)),
            `not a routeConfig helper in ${file}: revalidatePath(${arg}…) — see couponActions for the pattern`,
          ).toBe(true);
        }
      });
    });
  }
});
