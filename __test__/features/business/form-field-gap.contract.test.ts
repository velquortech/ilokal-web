/**
 * Field gaps never collapse below the rhythm the UI is built on.
 *
 * The app has two spacing standards, set by the wizard/dialog audit:
 *   - Multi-step wizards (registration, branch create) stack fields 24px
 *     apart (`space-y-6` / `gap-6` or larger on the step's root container).
 *   - Dialog bodies stack fields 16px apart (`space-y-4` / `gap-4` or larger).
 *
 * There is no runtime seam that catches a regression: nothing renders the
 * gap, so no component test fails when someone tightens `space-y-6` to
 * `space-y-4` (or `gap-6` to `gap-2`) on a step root or dialog body. The
 * spacing lives in class strings, so the contract is a source scan: every
 * wizard step's root container and every field-bearing dialog body must carry
 * at least its standard, or be listed here with a reason it is exempt.
 *
 * Discovery is by convention, not by allowlist — a NEW step file or dialog is
 * picked up automatically, so a regression is caught the moment it lands
 * rather than when someone remembers to add the file to a list.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** The two multi-step wizards. New step files here are covered automatically. */
const WIZARD_STEP_DIRS = [
  'app/business/registration/steps',
  'app/business/[businessId]/branches/create/steps',
];

/** Wizard steps whose root deliberately carries no vertical spacing class. */
const WIZARD_STEP_EXCEPTIONS: Record<string, string> = {
  'app/business/registration/steps/ShopCategoryStep.tsx':
    'a scrollable category grid, not a stacked form — the next-step rhythm lives in the grid cells',
  'app/business/registration/steps/ShopInformation.tsx':
    'two sections separated by a divider (Separator my-10); each section is its own `space-y-6` stack',
};

/** Field-bearing dialog bodies that deliberately sit under the 16px standard. */
const DIALOG_BODY_EXCEPTIONS: Record<string, string> = {
  'app/business/[businessId]/settings/components/DangerZoneTab.tsx':
    'compact danger confirmation (delete account), matching the 8px approve/disapprove confirmations',
};

/** The exported step component's opening `export function Name(`. */
const EXPORTED_FN = /export function \w+\([^)]*\)\s*\{/;

/** A `return (` whose JSX root is a `<div className="…">`. */
const ROOT_RETURN = /\breturn\s*\(\s*<div\s+className="([^"]*)"/g;

/** Source with block and line comments removed (for brace matching). */
function code(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * EVERY root container returned by the exported component — a step can have
 * more than one `return` (Deal: the "no deal yet" state AND the form), and a
 * rhythm regression in any of them is a defect. Scoped to the exported
 * function's brace-balanced body so helper components (e.g.
 * OfferingThumbnail in Offerings.tsx) and `return () => …` cleanup arrows
 * never count.
 */
function exportedRoots(source: string): string[] {
  const fn = source.match(EXPORTED_FN);
  if (!fn || fn.index === undefined) return [];
  // Walk from the exported function's `{` to its matching `}`.
  const start = fn.index + fn[0].length - 1;
  let depth = 0;
  let end = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) return [];
  const body = source.slice(start, end);
  return [...body.matchAll(ROOT_RETURN)].map((m) => m[1]);
}

/** Vertical spacing utilities: `space-y-N` or `gap-N` (both are px × 4). */
const V_SPACING = /(?:space-y|gap)-(\d+)/g;

function verticalGapsPx(className: string): number[] {
  return [...className.matchAll(V_SPACING)].map((m) => parseInt(m[1], 10) * 4);
}

/** One `<DialogBody …>…</DialogBody>` block: [props, children]. */
const DIALOG_BODY = /<DialogBody\b([^>]*?)(?:\/>|>([\s\S]*?)<\/DialogBody>)/g;

/** One `<DialogContent>…</DialogContent>` block (legacy dialogs). */
const DIALOG_CONTENT = /<DialogContent\b[^>]*>([\s\S]*?)<\/DialogContent>/g;

/** Any `<form …>` / `<div …>` element with an explicit className. */
const CLASSED_CONTAINER = /<(?:form|div)\b[\s\S]*?className="([^"]*)"/g;

/** Tags that make a block a form rather than a viewer or confirmation. */
const FIELD_TAGS =
  /<(?:Input|Textarea|Select|Controller|Field|Checkbox|RadioGroup|Switch|Combobox|DatePicker)\b/g;

/**
 * The largest vertical gap carried by any container that still has ≥2 fields
 * AFTER it in the block. Scoping to the remainder (rather than the whole
 * block) is what keeps a header or footer's own `gap-4` from counting as the
 * body's rhythm — a footer button row is not a field stack.
 */
function maxFieldContainerGapPx(children: string): number {
  let max = 0;
  for (const m of children.matchAll(CLASSED_CONTAINER)) {
    const className = m[1]!; // the one capture group always participates
    const remainder = children.slice(m.index! + m[0].length);
    if ((remainder.match(FIELD_TAGS) ?? []).length < 2) continue;
    max = Math.max(max, maxGapPx(className));
  }
  return max;
}

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir)).sort()) {
    const full = join(dir, entry);
    if (statSync(join(ROOT, full)).isDirectory()) {
      if (entry.startsWith('__test')) continue;
      out.push(...tsxFiles(full));
      continue;
    }
    if (entry.endsWith('.tsx') && !entry.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

/** All source files that mention a dialog body, either primitive. */
function dialogFiles(): string[] {
  const out: string[] = [];
  for (const dir of ['app', 'components']) {
    for (const file of tsxFiles(dir)) {
      const src = read(file);
      if (/<Dialog(?:Body|Content)\b/.test(src)) out.push(file);
    }
  }
  return out;
}

function maxGapPx(className: string): number {
  return Math.max(0, ...verticalGapsPx(className));
}

const indent = (s: string) =>
  s
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');

describe('field gaps keep their minimum rhythm', () => {
  // ── Wizard steps: 24px ────────────────────────────────────────────────
  describe('wizard step roots stay at the 24px rhythm', () => {
    const stepFiles = WIZARD_STEP_DIRS.flatMap((dir) =>
      tsxFiles(dir).filter((f) => f.startsWith(dir)),
    );
    const discovered = new Set(stepFiles);

    it('discovers at least one step in each wizard', () => {
      expect(stepFiles.length).toBeGreaterThan(0);
      for (const dir of WIZARD_STEP_DIRS) {
        expect(
          stepFiles.some((f) => f.startsWith(dir)),
          `no step files found under ${dir}`,
        ).toBe(true);
      }
    });

    it('exception entries all point at real, still-exempt steps', () => {
      for (const file of Object.keys(WIZARD_STEP_EXCEPTIONS)) {
        expect(
          discovered.has(file),
          `${file} is not a discovered step file`,
        ).toBe(true);
        const roots = exportedRoots(code(file));
        expect(
          roots.length > 0,
          `${file} — could not extract the exported component's root(s)`,
        ).toBe(true);
        for (const root of roots) {
          expect(
            verticalGapsPx(root).length === 0,
            `${file} is listed as an exception but a root now has spacing ` +
              `(${root}) — remove the entry`,
          ).toBe(true);
        }
      }
    });

    for (const file of stepFiles) {
      it(`${file.replace('app/business/', '')} roots carry ≥24px`, () => {
        const roots = exportedRoots(code(file));
        expect(
          roots.length > 0,
          `could not locate the exported component's root <div className="…"> — ` +
            `the extraction pattern needs updating for this file`,
        ).toBe(true);

        if (WIZARD_STEP_EXCEPTIONS[file]) return; // covered by the entry test

        for (const root of roots) {
          const gaps = verticalGapsPx(root);
          expect(
            gaps.length > 0,
            `a step root has no vertical spacing at all — add \`space-y-6\` / ` +
              `\`gap-6\` (24px) or document the exemption:\n${indent(root)}`,
          ).toBe(true);
          const min = Math.min(...gaps);
          expect(
            min >= 24,
            `a step root drops below the 24px rhythm (${min}px < 24px) — ` +
              `the wizard standard is \`space-y-6\` / \`gap-6\`:\n${indent(root)}`,
          ).toBe(true);
        }
      });
    }
  });

  // ── Dialog bodies: 16px ───────────────────────────────────────────────
  describe('dialog bodies stay at the 16px rhythm', () => {
    const files = dialogFiles();

    it('discovers the dialog surfaces', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it('exception entries still sit under 16px', () => {
      for (const file of Object.keys(DIALOG_BODY_EXCEPTIONS)) {
        const source = read(file);
        const blocks = [...source.matchAll(DIALOG_CONTENT)];
        expect(
          blocks.length > 0,
          `${file} is listed as an exception but has no DialogContent blocks`,
        ).toBe(true);
        const max = Math.max(
          ...blocks.map((b) => maxFieldContainerGapPx(b[1] ?? '')),
        );
        expect(
          max < 16,
          `${file} is listed as an exception but a field container now ` +
            `reaches ${max}px — remove the entry if it meets the 16px standard`,
        ).toBe(true);
      }
    });

    describe('<DialogBody> (the shared body primitive)', () => {
      for (const file of files.filter((f) => /<DialogBody\b/.test(read(f)))) {
        const blocks = [...read(file).matchAll(DIALOG_BODY)];
        for (const [i, block] of blocks.entries()) {
          it(`${file} body ${i + 1} carries ≥16px when it has fields`, () => {
            const props = block[1] ?? '';
            const children = block[2] ?? '';
            const className = props.match(/className="([^"]*)"/)?.[1] ?? null;
            const hasFields = FIELD_TAGS.test(children);

            if (hasFields && className === null) {
              throw new Error(
                `bare <DialogBody> with form fields — add an explicit ` +
                  `\`space-y-4\` (16px) so fields never touch:\n${indent(
                    block[0].slice(0, 400),
                  )}`,
              );
            }
            if (className !== null) {
              const gaps = verticalGapsPx(className);
              expect(
                gaps.length > 0,
                `<DialogBody className="${className}"> has no vertical ` +
                  `spacing utility`,
              ).toBe(true);
              const min = Math.min(...gaps);
              expect(
                min >= 16,
                `<DialogBody className="${className}"> drops below the ` +
                  `16px dialog standard (${min}px < 16px) — use \`space-y-4\` ` +
                  `or larger`,
              ).toBe(true);
            }
          });
        }
      }
    });

    describe('legacy dialogs (DialogContent without DialogBody)', () => {
      for (const file of files.filter((f) => !/<DialogBody\b/.test(read(f)))) {
        const source = read(file);
        const blocks = [...source.matchAll(DIALOG_CONTENT)];
        const multiField = blocks.filter(
          (b) => ((b[1] ?? '').match(FIELD_TAGS) ?? []).length >= 2,
        );
        if (multiField.length === 0) continue;

        it(`${file} stacks ≥2 fields with ≥16px on a field container`, () => {
          if (DIALOG_BODY_EXCEPTIONS[file]) return; // covered by the entry test
          for (const block of multiField) {
            const children = block[1] ?? '';
            const max = maxFieldContainerGapPx(children);
            expect(
              max >= 16,
              `no field-bearing container in this dialog body reaches 16px ` +
                `(max ${max}px) — at least one container holding ≥2 fields ` +
                `must sit on \`space-y-4\` / \`gap-4\` or larger:\n${indent(
                  children.slice(0, 500),
                )}`,
            ).toBe(true);
          }
        });
      }
    });
  });
});
