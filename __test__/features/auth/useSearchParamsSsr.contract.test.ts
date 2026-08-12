/**
 * Guard: `useSearchParams()` must never be rendered inside a Suspense boundary.
 *
 * A component that calls `useSearchParams()` suspends during SSR — the hook
 * cannot be resolved server-side — so the nearest Suspense boundary ships its
 * FALLBACK in the server HTML and the real content appears only after
 * client-side hydration. When the fallback is the page (sign-in, signup) or
 * its only form (reset-password), a user with slow or blocked JS gets a blank
 * page or a spinner. The production build even marks those routes dynamic and
 * still ships the fallback — dev rendering hides it, which is how it survived
 * review twice.
 *
 * The fix is to read the query string server-side (the page's `searchParams`
 * prop) and pass values down as props, dropping `useSearchParams` entirely.
 * This test sweeps the source so a future page cannot quietly reintroduce the
 * pattern:
 *
 *  1. the same file may not import both `Suspense` and `useSearchParams`
 *     (the sign-in/signup shape);
 *  2. a file that imports `Suspense` may not import a component that uses
 *     `useSearchParams` (the reset-password shape: the page wrapped the form);
 *  3. the three auth doors must keep reading the query string server-side.
 *
 * Bare `useSearchParams` without a Suspense boundary is fine (dynamic pages
 * resolve it from the request URL) and is deliberately not flagged.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

/** The UI surface — pages, components, hooks and providers. */
const SWEEP_DIRS = ['app', 'components', 'hooks', 'providers'];

/** The three auth doors, fixed to read the query string server-side. */
const AUTH_DOORS = [
  'app/(auth)/sign-in/page.tsx',
  'app/(auth)/signup/page.tsx',
  'app/(auth)/reset-password/page.tsx',
];

const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === '__test__') continue;
    if (entry.startsWith('.') || /\.test\.(ts|tsx)$/.test(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = SWEEP_DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)));

/**
 * Import patterns only: drop full-line comments and block comments first, so
 * a comment explaining the ban (`// import { Suspense } …`) can't trip the
 * guard.
 */
function stripComments(source: string): string {
  return source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Does `source` import `member` from `specifier` (named imports)? */
function importsFrom(
  source: string,
  specifier: string,
  member: string,
): boolean {
  const clean = stripComments(source);
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // `[^'"]*?` before the brace admits `import React, { X }` and
  // `import type { X }` forms without crossing into string literals.
  return new RegExp(
    `import\\s*[^'"]*?\\{[^}]*\\b${member}\\b[^}]*\\}\\s*from\\s*['"]${escaped}['"]`,
  ).test(clean);
}

/** Does `source` actually write a `<Suspense>` element (not just import it)? */
function usesSuspense(source: string): boolean {
  return /<Suspense[\s>/]/.test(stripComments(source));
}

/** Absolute paths of the project-local modules `source` imports. */
function localImports(source: string, file: string): string[] {
  const out: string[] = [];
  const re = /from\s*['"]((?:\.{1,2}\/[^'"]+)|(?:@\/[^'"]+))['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const spec = m[1];
    const base = spec.startsWith('@/')
      ? join(ROOT, spec.slice(2))
      : join(dirname(file), spec);
    for (const candidate of [
      base,
      `${base}.tsx`,
      `${base}.ts`,
      join(base, 'index.tsx'),
      join(base, 'index.ts'),
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

const USES_SEARCH_PARAMS = new Set(
  FILES.filter((file) =>
    importsFrom(
      readFileSync(file, 'utf8'),
      'next/navigation',
      'useSearchParams',
    ),
  ),
);

// Only files that actually render a `<Suspense>` boundary are a hazard — an
// unused Suspense import is a lint error anyway, and a useSearchParams import
// without a boundary is the legitimate dynamic-page pattern.
const WRAPS_IN_SUSPENSE = FILES.filter(
  (file) =>
    importsFrom(readFileSync(file, 'utf8'), 'react', 'Suspense') &&
    usesSuspense(readFileSync(file, 'utf8')),
);

describe('useSearchParams must not be server-rendered inside Suspense', () => {
  it('never imports both Suspense and useSearchParams in the same file', () => {
    for (const file of WRAPS_IN_SUSPENSE) {
      expect(
        USES_SEARCH_PARAMS.has(file),
        `${file}: imports both 'Suspense' and 'useSearchParams'. A useSearchParams ` +
          `subtree ships only the Suspense fallback in the server HTML. Read the ` +
          `query string server-side (the page's searchParams prop) and pass values ` +
          `down as props instead.`,
      ).toBe(false);
    }
  });

  it('never wraps a useSearchParams component in Suspense from a page', () => {
    for (const file of WRAPS_IN_SUSPENSE) {
      const source = readFileSync(file, 'utf8');
      for (const imported of localImports(source, file)) {
        expect(
          USES_SEARCH_PARAMS.has(imported),
          `${file}: imports '${basename(imported)}' (which uses useSearchParams) ` +
            `and renders a <Suspense> boundary — the component ships only the ` +
            `fallback in the server HTML. Read the query string server-side and ` +
            `pass it as props instead.`,
        ).toBe(false);
      }
    }
  });

  it('auth doors read the query string server-side, not via useSearchParams', () => {
    for (const door of AUTH_DOORS) {
      expect(
        importsFrom(read(door), 'next/navigation', 'useSearchParams'),
        `${door}: must read the query string from the page's searchParams prop, ` +
          `not useSearchParams — the hook opts the form out of prerendering and ` +
          `the fields depend on hydration.`,
      ).toBe(false);
    }
  });
});
