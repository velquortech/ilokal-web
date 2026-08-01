/**
 * Brand contract — guards the v1.0 identity rollout.
 *
 * The v0.2 "Hablon Weave" green was scattered across the landing, the email
 * template, the map and the logo component. This sweep fails the build if any
 * of it comes back by copy-paste, and pins the asset + token surface that
 * `BrandLogo` and `globals.css` depend on.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '../../..');

/** Every hex from the retired green identity, per the old brand README. */
const RETIRED_GREEN = ['#65A30D', '#84CC16', '#15803D', '#ECFCCB'];

const SCANNED_DIRS = ['app', 'components', 'lib', 'config'];
const SCANNED_EXT = new Set(['.ts', '.tsx', '.css']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCANNED_EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

describe('retired identity', () => {
  it('no source file reintroduces a v0.2 green', () => {
    const offenders: string[] = [];
    for (const dir of SCANNED_DIRS) {
      const full = join(ROOT, dir);
      if (!existsSync(full)) continue;
      for (const file of walk(full)) {
        if (file === __filename) continue; // this sweep has to name them
        const source = readFileSync(file, 'utf8');
        for (const hex of RETIRED_GREEN) {
          if (source.toUpperCase().includes(hex)) {
            offenders.push(`${file.slice(ROOT.length + 1)} → ${hex}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the green asset folders are gone', () => {
    expect(existsSync(join(ROOT, 'public/brand/svg'))).toBe(false);
    expect(existsSync(join(ROOT, 'public/brand/png'))).toBe(false);
    expect(existsSync(join(ROOT, 'app/icon.svg'))).toBe(false);
  });
});

describe('brand assets', () => {
  // BrandLogo references these by literal path; a rename would otherwise only
  // surface as a broken image in the browser.
  const REQUIRED = [
    'public/brand/mark/ilokal-mark-brick.png',
    'public/brand/mark/ilokal-mark-flame.png',
    'public/brand/wordmark/ilokal-wordmark-brick.png',
    'public/brand/wordmark/ilokal-wordmark-porcelain.png',
    'public/brand/wordmark/ilokal-wordmark-jasmine.png',
    'public/brand/icon/app-icon-1024.png',
    'app/icon.png',
    'app/apple-icon.png',
    'app/favicon.ico',
    'assets/fonts/Pally-Regular.woff2',
    'assets/fonts/Pally-Medium.woff2',
    'assets/fonts/Pally-Bold.woff2',
  ];

  it.each(REQUIRED)('%s exists', (relative) => {
    expect(existsSync(join(ROOT, relative))).toBe(true);
  });
});

describe('brand tokens', () => {
  const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');

  it('declares the six brand colours as raw tokens', () => {
    for (const token of [
      '--brand:',
      '--brand-jasmine:',
      '--brand-cornsilk:',
      '--brand-petal:',
      '--brand-porcelain:',
      '--brand-charcoal:',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('keeps destructive off the brand red', () => {
    // Both light and dark destructive must differ from their mode's primary,
    // or Delete renders as a brand CTA.
    const light = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
    const dark = css.slice(css.indexOf('.dark {'));
    for (const block of [light, dark]) {
      const primary = /--primary:\s*([^;]+);/.exec(block)?.[1].trim();
      const destructive = /--destructive:\s*([^;]+);/.exec(block)?.[1].trim();
      expect(primary).toBeTruthy();
      expect(destructive).toBeTruthy();
      expect(destructive).not.toBe(primary);
    }
  });

  it('does not point --font-display at a variable of the same name', () => {
    // A self-reference is invalid at computed-value time on :root, which
    // silently drops the display face outside the font-variable scope.
    expect(css).not.toMatch(/--font-display:\s*var\(--font-display\)/);
  });
});
