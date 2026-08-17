/**
 * Dev CSP widening contract.
 *
 * Local rows can carry ABSOLUTE cloud storage URLs — `make pull-live` restores
 * live data verbatim and no longer rewrites rows — and the dev CSP would
 * otherwise only know the local stack (NEXT_PUBLIC_SUPABASE_URL →
 * 127.0.0.1:54321), so those images render as broken in local dev even though
 * the files exist. `next.config.ts` fixes that by reading the live storage
 * origin from the git-ignored `.env.cloud` (`liveStorageOrigin`) and pushing
 * it into `img-src` via `buildCSPImageSources()`.
 *
 * This failure mode is SILENT: a future edit that drops the widening leaves
 * every absolute-URL image broken in local dev with no error anywhere — the
 * browser simply refuses to load the CSP-blocked URL. So it is pinned at the
 * source level, the same way the sibling `sentry-config` and
 * `server-action-body-limit` suites pin their config invariants: `next.config.ts`
 * is a build-time module that reads env vars, so importing it under the node
 * test environment proves less than reading what it declares.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const config = read('next.config.ts');
const pullLive = read('supabase/scripts/pull-live.sh');

/**
 * Strip comments before any "this string must not appear" sweep.
 *
 * The config deliberately EXPLAINS the widening by name (`liveStorageOrigin`,
 * `.env.cloud`), and a sweep that fails on its own explanation teaches the
 * next person to delete the explanation, which is the opposite of what it is
 * for. Same approach as the sentry and image-compression contract sweeps.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('dev CSP widening for absolute cloud storage URLs', () => {
  it('declares liveStorageOrigin()', () => {
    expect(config).toMatch(/const liveStorageOrigin = \(\): string \| null =>/);
  });

  it('reads the live origin from .env.cloud, never a hardcoded literal', () => {
    expect(config).toMatch(/existsSync\('\.env\.cloud'\)/);
    expect(config).toMatch(/readFileSync\('\.env\.cloud', 'utf8'\)/);
    // The exact env key it pulls, pinned so a rename breaks the contract
    // instead of silently reading nothing.
    expect(config).toContain('/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m');
    // No literal Supabase project ref may appear in code — the origin must
    // come from the file, or the widening stops following the real project.
    expect(stripComments(config)).not.toMatch(
      /https:\/\/[a-z0-9]{15,}\.supabase\.co/,
    );
  });

  it('is dev-only: returns null in production', () => {
    // Production img-src already allows a bare `https:`, so the widening is a
    // dev concern; running it in prod would be dead weight at best.
    expect(config).toMatch(
      /if \(process\.env\.NODE_ENV === 'production'\) return null;/,
    );
  });

  it('is wired into the img-src builder', () => {
    expect(config).toMatch(/const cloudOrigin = liveStorageOrigin\(\);/);
    expect(config).toMatch(/sources\.includes\(cloudOrigin\)/);
    expect(config).toMatch(/sources\.push\(cloudOrigin\)/);
  });

  it('the CSP header still renders img-src through buildCSPImageSources()', () => {
    // If the header stopped using the builder, every assertion above could
    // stay green while the header serves a hand-written img-src without it.
    expect(config).toMatch(/img-src \$\{buildCSPImageSources\(\)\}/);
  });

  it('pull-live.sh reads the SAME key from the SAME file', () => {
    // The script is what puts the live URL into .env.cloud and what the
    // config reads it back from. If one side stops using the key/file, the
    // widening silently loses its source — the CSP no-ops and absolute-URL
    // images break in dev again.
    expect(pullLive).toMatch(/grep -E '\^NEXT_PUBLIC_SUPABASE_URL='/);
    expect(pullLive).toMatch(/\.env\.cloud/);
  });

  it('the extraction works against the current .env.cloud format', () => {
    if (!existsSync(join(ROOT, '.env.cloud'))) return; // CI / fresh checkouts have no live creds
    const envCloud = read('.env.cloud');
    const line = envCloud
      .split('\n')
      .find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
    expect(
      line,
      '.env.cloud must declare NEXT_PUBLIC_SUPABASE_URL',
    ).toBeDefined();
    const raw = (line as string)
      .slice('NEXT_PUBLIC_SUPABASE_URL='.length)
      .trim();
    const value = raw.replace(/^"|"$/g, '');
    // Reimplement exactly what liveStorageOrigin + parseImageUrl do, so a
    // drift in the real file's shape fails here instead of in a browser.
    let origin: string | null = null;
    try {
      const parsed = new URL(value);
      origin = parsed.port
        ? `${parsed.protocol.slice(0, -1)}://${parsed.hostname}:${parsed.port}`
        : `${parsed.protocol.slice(0, -1)}://${parsed.hostname}`;
    } catch {
      origin = null;
    }
    expect(origin).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  });
});
