/**
 * Server Action upload-size contract.
 *
 * Server Actions default to a 1 MB request body. Several upload actions accept
 * files up to 2 MB (`MAX_IMAGE_SIZE` / `MAX_DOC_SIZE`), so without an explicit
 * `experimental.serverActions.bodySizeLimit` a valid 2 MB image is rejected by
 * the transport with a 413 ("Body exceeded 1 MB limit") before the handler's
 * own size check ever runs — which is what broke the product-catalogue image
 * upload.
 *
 * Asserted at the source level: `next.config.ts` is a build-time module that
 * reads env vars, so importing it under the node test environment proves less
 * than reading what it declares.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const config = readFileSync(join(ROOT, 'next.config.ts'), 'utf8');

const ACTION_SIZE_CAPS = [
  'app/business/[businessId]/actions/productActions.ts',
  'app/business/[businessId]/actions/branchActions.ts',
];

const MB = 1024 * 1024;

function declaredBodySizeLimitBytes(): number {
  const match = config.match(/bodySizeLimit:\s*'(\d+)(mb|kb)'/i);
  expect(
    match,
    'next.config.ts must declare a serverActions.bodySizeLimit',
  ).not.toBeNull();
  const [, value, unit] = match as RegExpMatchArray;
  return Number(value) * (unit.toLowerCase() === 'mb' ? MB : 1024);
}

describe('serverActions.bodySizeLimit', () => {
  it('is declared under experimental.serverActions', () => {
    expect(config).toMatch(/experimental:\s*\{/);
    expect(config).toMatch(/serverActions:\s*\{/);
    expect(config).toMatch(/bodySizeLimit:/);
  });

  it('exceeds every per-file cap an upload action enforces', () => {
    const limit = declaredBodySizeLimitBytes();

    for (const relative of ACTION_SIZE_CAPS) {
      const source = readFileSync(join(ROOT, relative), 'utf8');
      const caps = [
        ...source.matchAll(/MAX_\w+_SIZE\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/g),
      ];
      expect(caps.length, `${relative} declares no size cap`).toBeGreaterThan(
        0,
      );

      for (const [, mb] of caps) {
        // Strictly greater: the body carries multipart boundaries and the
        // other form fields on top of the file itself.
        expect(limit).toBeGreaterThan(Number(mb) * MB);
      }
    }
  });

  it('stays under the 4.5 MB Vercel function body cap', () => {
    expect(declaredBodySizeLimitBytes()).toBeLessThanOrEqual(4.5 * MB);
  });
});
