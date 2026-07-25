/**
 * Guardrail for the wrap-safe table-toolbar contract (see
 * .claude/TABLE_TOOLBAR.md).
 *
 * The two class bugs that clipped/overlapped every table toolbar:
 *  1. `SearchBar`'s wrapper hardcoded `min-w-sm` (384px) — call sites could
 *     not shrink it, so it shoved the other controls out of the row.
 *  2. Toolbar rows used `inline-flex h-10` — a fixed-height, non-wrapping row
 *     that lets its children overlap once they exceed the available width.
 *
 * Source-level assertions (same rationale as dialog.contract.test.ts): the
 * invariant is a class recipe, so asserting the source is equivalent to
 * asserting the render and needs no DOM.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');

describe('SearchBar wrapper', () => {
  const source = readFileSync(
    path.join(repoRoot, 'components/custom/Searchbar.tsx'),
    'utf8',
  );

  it('is shrinkable (min-w-0), never a fixed min-width block', () => {
    expect(source).toContain('min-w-0');
    // min-w-0 is allowed; any other min-w-* (min-w-sm, min-w-[300px], …) is not
    expect(source).not.toMatch(/min-w-(?!0[^.\d])/);
  });
});

describe('DataTablePagination', () => {
  const source = readFileSync(
    path.join(repoRoot, 'components/custom/data-table/DataTablePagination.tsx'),
    'utf8',
  );

  it('wraps instead of overflowing on narrow widths', () => {
    expect(source).toContain('flex-wrap');
    expect(source).not.toMatch(/\bspace-x-/);
  });
});

// ---------------------------------------------------------------------------
// Repo-wide sweep: no page reintroduces the fixed-height non-wrap toolbar row
// ---------------------------------------------------------------------------

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsxFiles(full, acc);
    } else if (entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('table toolbar rows across the app', () => {
  // components/ui is excluded: primitives there (e.g. tabs.tsx) legitimately
  // use inline-flex h-10 for non-toolbar purposes.
  const sweepDirs = [
    path.join(repoRoot, 'app'),
    path.join(repoRoot, 'components/custom'),
  ];

  it('never uses the fixed-height non-wrapping row idiom', () => {
    const offenders: string[] = [];
    for (const dir of sweepDirs) {
      for (const file of collectTsxFiles(dir)) {
        const source = readFileSync(file, 'utf8');
        if (/inline-flex h-10/.test(source)) {
          offenders.push(path.relative(repoRoot, file));
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
