/**
 * Guardrail for the responsive-modal contract (see .claude/MODAL_RESPONSIVE.md).
 *
 * These are source-level assertions, not render tests: Radix `Dialog` renders
 * its content through a React Portal, which produces no markup under
 * `renderToStaticMarkup` in the node test env — so the rendered HTML can't be
 * inspected. Asserting on the component source gives the same guarantee (the
 * base primitive keeps its viewport cap + scroll behaviour) without a DOM.
 *
 * The usage sweep below is the important regression net: it fails the build if
 * any `<DialogContent>` in the app reintroduces a fixed height or an
 * over-viewport min-width — the two class bugs that made modals overflow small
 * screens in the first place.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const dialogSource = readFileSync(
  path.join(repoRoot, 'components/ui/dialog.tsx'),
  'utf8',
);

describe('DialogContent base primitive', () => {
  it('caps height to the dynamic viewport', () => {
    expect(dialogSource).toContain('max-h-[calc(100dvh-2rem)]');
  });

  it('is a scrollable flex column (so header/footer can be pinned)', () => {
    expect(dialogSource).toContain('flex-col');
    expect(dialogSource).toContain('overflow-y-auto');
    expect(dialogSource).toContain('overscroll-contain');
  });

  it('keeps a margin from the viewport edges', () => {
    expect(dialogSource).toContain('max-w-[calc(100%-2rem)]');
  });

  it('reserves scroll-padding so the mobile keyboard cannot hide a field', () => {
    expect(dialogSource).toContain('scroll-p-4');
    expect(dialogSource).toContain('sm:scroll-p-6');
  });

  it('steps padding down on small screens', () => {
    expect(dialogSource).toMatch(/\bp-4\b/);
    expect(dialogSource).toContain('sm:p-6');
  });
});

describe('DialogBody', () => {
  it('is exported', () => {
    expect(dialogSource).toMatch(/\bDialogBody\b/);
    expect(dialogSource).toContain('data-slot="dialog-body"');
  });

  it('is the flex-1 scroll region', () => {
    // pulled from the DialogBody className literal
    expect(dialogSource).toContain('min-h-0 flex-1');
    expect(dialogSource).toContain('overflow-y-auto');
  });
});

// ---------------------------------------------------------------------------
// Repo-wide usage sweep
// ---------------------------------------------------------------------------

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsxFiles(full, acc);
    } else if (entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

/** Extract the className string of every `<DialogContent …>` opening tag. */
function dialogContentClassNames(source: string): Array<{ className: string }> {
  const results: Array<{ className: string }> = [];
  let searchFrom = 0;
  for (;;) {
    const tagStart = source.indexOf('<DialogContent', searchFrom);
    if (tagStart === -1) break;
    searchFrom = tagStart + 1;
    // The props region ends at the first child element. `className` on every
    // DialogContent in this repo is a plain string literal.
    const nextChild = source.indexOf('<', tagStart + 1);
    const region = source.slice(
      tagStart,
      nextChild === -1 ? undefined : nextChild,
    );
    const match = region.match(/className="([^"]*)"/);
    if (match) {
      results.push({ className: match[1] });
    }
  }
  return results;
}

const tsxFiles = collectTsxFiles(repoRoot);

// Fixed height: `h-200`, `h-140`, `h-[80vh]`, `h-[560px]` — anything where a
// bare `h-` is followed by a digit or a bracketed length. `max-h-*` is allowed
// (the char before `h` is `-`, not whitespace/start, so it never matches).
const FIXED_HEIGHT = /(?:^|\s)h-(?:\d|\[)/;
// Over-viewport min-width: `min-w-3xl`, `min-w-[48rem]` etc.
const MIN_WIDTH = /(?:^|\s)min-w-/;

describe('DialogContent usage across the app', () => {
  const offenders: string[] = [];

  for (const file of tsxFiles) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('<DialogContent')) continue;
    for (const { className } of dialogContentClassNames(source)) {
      if (FIXED_HEIGHT.test(className)) {
        offenders.push(
          `${path.relative(repoRoot, file)} → fixed height in "${className}"`,
        );
      }
      if (MIN_WIDTH.test(className)) {
        offenders.push(
          `${path.relative(repoRoot, file)} → min-width in "${className}"`,
        );
      }
    }
  }

  it('never sets a fixed height (use max-h + DialogBody instead)', () => {
    const heightOffenders = offenders.filter((o) => o.includes('fixed height'));
    expect(heightOffenders, heightOffenders.join('\n')).toEqual([]);
  });

  it('never sets an over-viewport min-width (breaks narrow screens)', () => {
    const widthOffenders = offenders.filter((o) => o.includes('min-width'));
    expect(widthOffenders, widthOffenders.join('\n')).toEqual([]);
  });

  it('finds real DialogContent usages (sweep is not a no-op)', () => {
    const total = tsxFiles.filter((f) =>
      readFileSync(f, 'utf8').includes('<DialogContent'),
    ).length;
    expect(total).toBeGreaterThan(10);
  });
});
