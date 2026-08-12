/**
 * One branded OG card for every public business surface.
 *
 * Source-level, matching the repo's contract-test convention: the drift risk
 * is a call site being pointed back at its own image — a `cardImage` line
 * deleted or reverted — which a source sweep catches and a render test does
 * not. The behavioral half is covered elsewhere: `socialCard.test.ts` asserts
 * the helper turns `cardImage` into both `og:image` and `twitter:image` (and
 * earns `summary_large_image`), and `business-og-card-route.test.ts` proves
 * the endpoint these paths point at actually renders.
 *
 * Comments are stripped before matching, so these files' own explanations of
 * the unification cannot trip the sweep that guards it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/** Source with block and line comments removed. */
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const BUSINESS_PAGES = [
  'app/s/[businessId]/page.tsx',
  'app/explore/[businessId]/page.tsx',
];

describe('every public business page points og:image at the generated card', () => {
  it.each(BUSINESS_PAGES)(
    '%s passes cardImage built from the route’s own businessId',
    (file) => {
      const source = code(file);
      // The exact shape, not a contains-check: a hardcoded id or a path that
      // stopped deriving from the route param would fail to match.
      expect(source).toMatch(
        /cardImage:\s*`\/api\/og\/business\/\$\{businessId\}`/,
      );
      expect(source).toContain('businessSocialCard(');
    },
  );

  it('the share route keeps the logo as its fallback image', () => {
    // The fallback exists so the page keeps SOME image if the generated route
    // is ever dropped — but it must never win while cardImage is set.
    expect(code('app/s/[businessId]/page.tsx')).toContain('logo:');
  });

  it('the explore route keeps the banner AND logo as fallbacks', () => {
    const source = code('app/explore/[businessId]/page.tsx');
    expect(source).toContain('banner:');
    expect(source).toContain('logo:');
  });

  it('the event page stays on its own image — a business card would 404 for an event id', () => {
    // /events/[eventId] reuses the builder for the OG boilerplate but keeps
    // its own event image; the generated card only queries the businesses
    // table, so pointing it at an event would advertise a broken image.
    expect(code('app/events/[eventId]/page.tsx')).not.toContain('cardImage');
  });
});

describe('the endpoint the pages point at renders the card', () => {
  const ROUTE = 'app/api/og/business/[businessId]/route.tsx';

  it('exists and renders the shared BusinessShareCard', () => {
    const source = code(ROUTE);
    expect(source).toContain('BusinessShareCard');
    expect(source).toContain("from '@/lib/og/businessShareCard'");
  });

  it('serves PNG with the revalidating cache, never the immutable ImageResponse default', () => {
    const source = code(ROUTE);
    expect(source).toMatch(/max-age=300/);
    expect(source).toMatch(/s-maxage=300/);
    expect(source).toMatch(/'Content-Type': 'image\/png'/);
  });

  it('only renders verified, non-archived businesses, matching what the pages show', () => {
    const source = code(ROUTE);
    expect(source).toMatch(/\.eq\('status', 'verified'\)/);
    expect(source).toMatch(/\.is\('archived_at', null\)/);
  });
});
