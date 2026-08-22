import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidResourceId } from '@/app/api/helpers/resourceId';

const ROOT = process.cwd();

/**
 * Every route whose path segment is fed to Postgres as a `uuid`.
 *
 * 🔴 The bug: `GET /api/mobile/businesses/bida-ngayon/products` — the mobile
 * client asking for a shop by SLUG. Unvalidated, that reached PostgREST as a
 * `uuid`, Postgres raised `22P02`, and the route answered 500
 * (JAVASCRIPT-NEXTJS-6 / -E / -F). A 500 also HID the finding: a 404 says out
 * loud that the app has a deep-link shape this API does not serve.
 */
const ID_ROUTES = [
  'app/api/mobile/businesses/[businessId]/route.ts',
  'app/api/mobile/businesses/[businessId]/products/route.ts',
  'app/api/mobile/businesses/[businessId]/coupons/route.ts',
  'app/api/mobile/businesses/[businessId]/ratings/route.ts',
  'app/api/mobile/businesses/[businessId]/share/route.ts',
  'app/api/mobile/businesses/[businessId]/view/route.ts',
  'app/api/protected/mobile/follows/[businessId]/route.ts',
  'app/api/protected/mobile/ratings/businesses/[businessId]/route.ts',
];

// Comments quote the bad value by name, so a sweep that matched them would
// pass on its own explanation.
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('isValidResourceId', () => {
  it('accepts this app’s own ids', () => {
    // Real ids read out of production on 2026-08-22.
    expect(isValidResourceId('70490ba4-e8a6-4c27-9f78-9c3ebdd76070')).toBe(
      true,
    );
    expect(isValidResourceId('e6b73c4b-47f4-4e2b-b1d5-7b02e346e47d')).toBe(
      true,
    );
  });

  it('rejects the slug the mobile app actually sent', () => {
    expect(isValidResourceId('bida-ngayon')).toBe(false);
  });

  it('rejects the empty and absent cases', () => {
    // A falsy id must never be read as "no argument given" further down — that
    // is the multi-shop `verifyBusinessOwner()` class of bug.
    expect(isValidResourceId('')).toBe(false);
    expect(isValidResourceId(undefined)).toBe(false);
    expect(isValidResourceId(null)).toBe(false);
  });

  it('rejects near-misses', () => {
    expect(isValidResourceId('70490ba4-e8a6-4c27-9f78-9c3ebdd7607')).toBe(
      false,
    );
    expect(isValidResourceId('70490ba4e8a64c279f789c3ebdd76070')).toBe(false);
    expect(isValidResourceId('  70490ba4-e8a6-4c27-9f78-9c3ebdd76070  ')).toBe(
      false,
    );
  });
});

describe('every [businessId] route validates the segment', () => {
  it.each(ID_ROUTES)('%s guards before querying', (relative) => {
    const source = stripComments(readFileSync(join(ROOT, relative), 'utf8'));
    expect(source).toContain('isValidResourceId(businessId)');
    expect(source).toContain('notFoundResponse');
  });

  it.each(ID_ROUTES)('%s guards BEFORE the first Supabase call', (relative) => {
    // Order is the whole point. Validating after the query is validating
    // nothing: the 22P02 has already happened and already been reported.
    const source = stripComments(readFileSync(join(ROOT, relative), 'utf8'));
    const guard = source.indexOf('isValidResourceId(businessId)');
    const firstQuery = Math.min(
      ...[
        source.indexOf('.from('),
        source.indexOf('.rpc('),
        source.indexOf('supabase.storage'),
      ].filter((i) => i !== -1),
    );
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstQuery);
  });
});
