/**
 * Guardrail for "one dialect everywhere" (.claude/APP_REVAMP.md §10, phase A).
 *
 * Source-level, like the dialog contract: these pages are async server
 * components that fetch through Supabase, so rendering them in the node test
 * env is not possible — but the regression this guards is textual anyway.
 * Every page that a signed-in person lands on used to hand-roll its own
 * heading (`text-2xl font-bold` on the customer portal, `text-xl font-semibold`
 * on settings/profile), which meant Pally never appeared and the app read as
 * three different products stitched together.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

/** Every page-level heading block in the app surfaces we own. */
const PAGES = [
  'app/customer/wallet/page.tsx',
  'app/customer/following/page.tsx',
  'app/business/[businessId]/settings/page.tsx',
  'app/business/[businessId]/profile/page.tsx',
  'app/business/[businessId]/shop/page.tsx',
  'app/business/[businessId]/coupons/components/coupons-content.tsx',
  'app/business/[businessId]/branches/components/branches-content.tsx',
  'app/business/[businessId]/product-catalogues/components/product-catalogues-content.tsx',
  'app/business/[businessId]/redeemed-coupons/components/redeemed-coupons-content.tsx',
] as const;

describe('PageHeader adoption', () => {
  it.each(PAGES)('%s renders a PageHeader', (rel) => {
    const source = read(rel);
    expect(source).toContain('PageHeader');
  });

  it.each(PAGES)('%s does not hand-roll a page heading', (rel) => {
    const source = read(rel);
    // The two scales that were in use before the sweep. A section <h2> is
    // fine — this only rejects the page-title scales.
    expect(source).not.toMatch(/<h1[^>]*text-2xl font-bold/);
    expect(source).not.toMatch(/<h1[^>]*text-xl font-semibold/);
  });
});

describe('PageHeader primitive', () => {
  const source = read('components/custom/PageHeader.tsx');

  it('sets the title on the display face', () => {
    expect(source).toContain('font-display');
  });

  it('scales the title with the viewport rather than pinning one size', () => {
    expect(source).toContain('clamp(');
  });
});
