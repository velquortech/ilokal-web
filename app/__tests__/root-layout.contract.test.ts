/**
 * Root-layout direction contract.
 *
 * The document direction is pinned with `dir="ltr"` instead of being left to
 * the browser. `lang="en"` sets the LANGUAGE; the direction still defaults
 * from the user agent's UI locale, so on a device set to an RTL language
 * (Arabic, Hebrew, Urdu, Persian...) the whole document — including every
 * form input — silently renders right-to-left, and typing Latin text displays
 * reversed: the caret starts at the right edge and each character is added
 * leftward, so "Juan" reads as "nauJ". This app is English-only Latin script,
 * so LTR is always correct.
 *
 * The attribute must sit on the `<html>` element itself: that is where the UA
 * resolves the document direction before first paint, and only an explicit
 * attribute beats an RTL-configured UA default.
 *
 * Asserted at the source level rather than by booting the app, for the same
 * reason as `social-preview.contract.test.ts`: `app/layout.tsx` pulls in
 * `next/font/local` and `globals.css`, neither of which loads under the node
 * test environment.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const layout = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8');
const globalError = readFileSync(join(ROOT, 'app/global-error.tsx'), 'utf8');

describe('root layout document direction', () => {
  it('pins the document language to English', () => {
    expect(layout).toMatch(/<html[^>]*lang="en"/);
  });

  it('pins the document direction to ltr on the <html> element', () => {
    // `[^>]*` stops at the tag's `>`, so this can only match an attribute of
    // the html opening tag itself — a `dir` on an inner wrapper would not
    // satisfy it (and would not fix the bug anyway).
    expect(layout).toMatch(/<html[^>]*dir="ltr"/);
  });

  it('never renders an rtl document', () => {
    expect(layout).not.toMatch(/<html[^>]*dir="rtl"/);
  });
});

describe('the global error document', () => {
  // `global-error.tsx` REPLACES the whole document, so it renders its own
  // <html> and cannot inherit the root layout's attributes — the one place
  // the direction could silently drop again. Same rule, same reason.
  it('pins lang and dir the same way as the root layout', () => {
    expect(globalError).toMatch(/<html[^>]*lang="en"/);
    expect(globalError).toMatch(/<html[^>]*dir="ltr"/);
    expect(globalError).not.toMatch(/<html[^>]*dir="rtl"/);
  });
});
