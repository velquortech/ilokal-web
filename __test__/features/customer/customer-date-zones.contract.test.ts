/**
 * Every customer-facing date render must pin `BUSINESS_TIME_ZONE`.
 *
 * A `toLocaleDateString` / `toLocaleTimeString` / `Date.toLocaleString`
 * without an explicit `timeZone` renders in UTC during SSR and the device zone
 * after hydration — a mismatch on every row, and the wrong day/time for a
 * customer abroad. That is exactly the bug class this test guards: an update
 * published on a Manila evening showed the previous day on first paint (see
 * `following/page.tsx` and `coupon-card.tsx` for the two that were caught).
 *
 * Source-scan because the failure is an ABSENT option, which renders fine and
 * leaves no runtime trace. Comments are stripped first — the comments in these
 * files quote the very option that was added.
 *
 * Number formatting (`value.toLocaleString()`) is deliberately NOT matched:
 * only calls that format a `Date` are asserted, and the patterns below only
 * hit `new Date(...).toLocaleString(...)`.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CUSTOMER_DIRS = [
  'app/customer',
  'app/explore',
  'app/events',
  'components/customer',
];

const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Only date-typed renders: date/time formatters, and `toLocaleString` on a `new Date`. */
const DATE_RENDER =
  /toLocaleDateString\(|toLocaleTimeString\(|new Date\([^)]*\)\.toLocaleString\(/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('customer-facing dates render in the business time zone', () => {
  const files = CUSTOMER_DIRS.flatMap(walk).sort();

  it('scans a real surface', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  let dateRenders = 0;
  for (const file of files) {
    const source = code(readFileSync(file, 'utf8'));
    const matches = [...source.matchAll(DATE_RENDER)];
    if (matches.length === 0) continue;
    dateRenders += matches.length;

    describe(file.replace(process.cwd(), ''), () => {
      for (const match of matches) {
        it('pins BUSINESS_TIME_ZONE on every date render', () => {
          // For `new Date(...).toLocaleString(` the balanced scan must start at
          // the METHOD call, not the inner `new Date(` parens.
          const callStart = match[0].includes('toLocaleString(')
            ? match.index + match[0].lastIndexOf('toLocale')
            : match.index;
          const snippet = callText(source, callStart);
          expect(snippet, `date render without a zone: ${snippet}`).toMatch(
            /timeZone:\s*BUSINESS_TIME_ZONE/,
          );
        });
      }
    });
  }

  it('found at least one date render to guard (not vacuous)', () => {
    expect(dateRenders).toBeGreaterThan(0);
  });
});

/** The full call starting at `start`, balanced to its closing paren. */
function callText(source: string, start: number): string {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return source.slice(start);
}
