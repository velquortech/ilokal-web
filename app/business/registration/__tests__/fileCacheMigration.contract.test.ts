/**
 * Guards the fix for the registration `QuotaExceededError`.
 *
 * File bytes must never go back into localStorage. That is not a style
 * preference: `interior_images` requires at least four images of up to 2 MB
 * each, base64 adds a third, and browsers count the string as UTF-16 — ~21 MB
 * against a ~5 MB quota. Any reintroduction of the old approach breaks the
 * wizard for every conforming gallery, so it fails the build here instead.
 *
 * Asserted at the source level, like `brand.contract.test.ts` and
 * `mapPicker.contract.test.ts`: the failure mode is "someone writes bytes to
 * the wrong store", which a source sweep catches and a render test would not.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const formCache = read('hooks/useFormCache.ts');
const fileCache = read('hooks/fileCache.ts');
const gallery = read('steps/Gallery.tsx');
const documents = read('steps/Documents.tsx');

describe('registration file cache contract', () => {
  it('never writes file bytes to localStorage', () => {
    // The legacy prefix may only be READ and REMOVED, never written.
    const legacyWrites = formCache.match(
      /localStorage\.setItem\(\s*`?\$?\{?LEGACY_FILE_CACHE_PREFIX/g,
    );
    expect(legacyWrites).toBe(null);

    // Only the metadata cache key is written, and it holds names and sizes.
    const writes = formCache.match(/localStorage\.setItem\(/g) ?? [];
    expect(writes).toHaveLength(1);
    expect(formCache).toContain('localStorage.setItem(FORM_CACHE_KEY');
  });

  it('does not base64 a picked file anywhere in the wizard', () => {
    // `readAsDataURL` is what inflated 8 MB of images into 21 MB of string.
    for (const source of [formCache, fileCache, gallery, documents]) {
      expect(source).not.toContain('readAsDataURL');
    }
  });

  it('keeps the legacy entries readable once, then deletes them', () => {
    // An owner mid-registration keeps whatever small files DID fit, and the
    // dead bytes stop occupying the quota for everything else on the origin.
    expect(formCache).toContain('LEGACY_FILE_CACHE_PREFIX');
    expect(formCache).toMatch(/removeItem\(`\$\{LEGACY_FILE_CACHE_PREFIX\}/);
  });

  it('stores the bytes in IndexedDB, via the one store module', () => {
    expect(fileCache).toContain('indexedDB.open');
    expect(formCache).toMatch(/from '\.\/fileCache'/);
    // The hook delegates rather than talking to IndexedDB itself; a second
    // implementation is a second quota story to reason about.
    expect(formCache).not.toContain('indexedDB');
  });

  it('leaves the callers’ signatures untouched', () => {
    // The steps still call the same three functions, so this fix did not turn
    // into a refactor of every upload control.
    expect(gallery).toContain("cacheFile('shop_logo'");
    expect(gallery).toContain("cacheFiles('interior_images'");
    expect(gallery).toContain("clearFileCache('interior_images')");
    expect(documents).toContain('cacheFile(props.fieldName, file)');
  });

  it('clears both stores when a registration completes', () => {
    // Leaving either behind means a finished registration keeps megabytes of
    // dead bytes for the rest of the origin's life.
    expect(formCache).toContain('clearAllFiles()');
    expect(formCache).toContain('LEGACY_FILE_FIELDS');
  });
});
