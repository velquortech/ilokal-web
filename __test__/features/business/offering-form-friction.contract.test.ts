/**
 * Phase 1 of the registration-menu plan: the friction that stops a catalogue
 * at one item (`.claude/REGISTRATION_MENU.md`, RM6/RM8 and the deep link).
 *
 * Asserted at the SOURCE level, not by rendering. These dialogs pull in the
 * business + vocabulary providers, the Celebrate context, two Server Actions
 * and the shared image uploader; rendering them proves the mocks work. What is
 * actually at risk here is a class attribute being reordered, a `required` rule
 * being pasted back, or a link being pointed at the plain page again — all of
 * which a source sweep catches and a render test does not.
 *
 * Comments are stripped before matching: several of these files explain the
 * thing that was removed, and a sweep that fails on its own explanation
 * teaches people to delete the explanation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const CATALOGUE_COMPONENTS =
  'app/business/[businessId]/product-catalogues/components';

const ADD_PRODUCT = `${CATALOGUE_COMPONENTS}/add-product.tsx`;
const UPDATE_PRODUCT = `${CATALOGUE_COMPONENTS}/update-product.tsx`;
const APPLY_SALE = `${CATALOGUE_COMPONENTS}/apply-sale.tsx`;
const CATALOGUE_CONTENT = `${CATALOGUE_COMPONENTS}/product-catalogues-content.tsx`;

/** Every dialog an owner fills in on a phone while building a catalogue. */
const OFFERING_DIALOGS = [ADD_PRODUCT, UPDATE_PRODUCT, APPLY_SALE];

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

/** Source with block and line comments removed. */
function code(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('RM8 — offering dialogs stack to one column on a phone', () => {
  it.each(OFFERING_DIALOGS)(
    'declares no unprefixed grid-cols-2 in %s',
    (file) => {
      // A bare `grid-cols-2` applies at every width, so Price lands beside
      // Price Type — and two datetime-local controls land side by side — at
      // 320px, which is where owners registering from a phone actually are.
      // Any two-column layout must be gated behind a breakpoint.
      const bare = code(file).match(/(?<![a-z:-])grid-cols-2\b/g) ?? [];
      expect(bare).toEqual([]);
    },
  );

  it('still lays the add form out in two columns on wider screens', () => {
    // The fix is "stack on phones", not "give up on two columns" — a desktop
    // form of single-column fields is its own regression.
    expect(code(ADD_PRODUCT)).toMatch(/sm:grid-cols-2/);
    expect(code(APPLY_SALE)).toMatch(/sm:grid-cols-2/);
  });
});

describe('RM6 — category is optional in the add form', () => {
  const source = code(ADD_PRODUCT);

  it('does not require a category', () => {
    // `createProductShape` only ever required `name`; this form required a
    // 9-to-20 option select on top of it. A shop that sells one thing then
    // picks whatever clears the form, and a WRONG category misleads the
    // explore filter in a way NULL does not.
    expect(source).not.toMatch(/required:\s*['"]Category is required['"]/);
    expect(source).not.toMatch(/errors\.category_id/);
  });

  it('says so in the label', () => {
    expect(source).toMatch(/Category \(Optional\)/);
  });

  it('sends null rather than asserting a value it no longer demands', () => {
    expect(source).toMatch(/category_id:\s*data\.category_id \?\? null/);
    expect(source).not.toMatch(/category_id:\s*data\.category_id!/);
  });

  it('keeps the name and price required', () => {
    // The point is removing a field nobody needs, not removing validation. A
    // menu item with no price is not a menu item — `on_request` is the
    // existing escape hatch for genuinely quoted work.
    expect(source).toMatch(/required:\s*vocabulary\.nameRequiredLabel/);
    expect(source).toMatch(/required:\s*['"]Price is required['"]/);
  });
});

describe('save and add another', () => {
  const source = code(ADD_PRODUCT);

  it('offers the button', () => {
    expect(source).toMatch(/Save and add another/);
  });

  it('binds the intent into the handler instead of a mutable flag', () => {
    // A ref set by the button's onClick survives a REJECTED submit — the core
    // never runs, so nothing clears it, and the next press of the real Save
    // button silently behaves as "add another". Binding it into the submit
    // handler makes that state unrepresentable.
    expect(source).toMatch(/submitWith\(true\)/);
    expect(source).toMatch(/submitWith\(false\)/);
    expect(source).toMatch(
      /const submitWith\s*=\s*\(addAnother: boolean\)\s*=>/,
    );
  });

  it('carries the repeated choices to the next item', () => {
    // A menu is many items in one category and section. Re-picking them per
    // item is the tax the button exists to remove. Anchored on the add-another
    // reset specifically — the restore-from-draft effect calls `reset({ ... })`
    // too, and the submit payload also writes `category_id: data.category_id`
    // (`?? null`), so a bare first-match sweep reads the wrong block. The
    // unique signature: `category_id:` immediately after `...emptyForm,` (the
    // restore spreads `...draft` there).
    const addAnotherReset =
      source.match(
        /reset\(\{\s*\.\.\.emptyForm,\s*category_id: data\.category_id,[\s\S]*?\}\);/,
      )?.[0] ?? '';
    expect(addAnotherReset).toMatch(/section_id: data\.section_id/);
    expect(addAnotherReset).toMatch(/price_type: data\.price_type/);
    expect(addAnotherReset).toMatch(/kind: data\.kind/);
  });

  it('spreads emptyForm first so the service attributes survive the reset', () => {
    // RHF's reset(values) REPLACES the whole value set: a partial literal
    // drops `service_location` et al, and their Radix Selects flip controlled
    // → uncontrolled on the next item. The dialog already carries this scar
    // once, in handleOpenChange.
    expect(source).toMatch(/reset\(\{\s*\.\.\.emptyForm,/);
  });

  it('returns focus to the name field', () => {
    expect(source).toMatch(/setFocus\(['"]name['"]\)/);
  });

  it('celebrates only the closing save', () => {
    // Confetti on each of ten items reads as noise, not as a moment.
    const celebrateCalls = source.match(/celebrate\(\)/g) ?? [];
    expect(celebrateCalls).toHaveLength(1);
  });
});

describe('?add=1 — the add dialog opens on arrival', () => {
  const content = code(CATALOGUE_CONTENT);
  const dialog = code(ADD_PRODUCT);

  it('seeds the open state from the marker rather than an effect alone', () => {
    // Seeded state means the dialog is there on the first client render; an
    // effect-only version paints the page, then pops the dialog a frame later.
    expect(content).toMatch(
      /useState\(\s*\(\)\s*=>\s*searchParams\.get\(CATALOGUE_ADD_PARAM\) === ['"]1['"]/,
    );
  });

  it('consumes the marker exactly once, ref-guarded', () => {
    // `useRouter()`'s identity is not something to bet a repeated `replace`
    // on — the same reason the welcome marker is ref-guarded and not
    // dep-guarded.
    expect(content).toMatch(/addMarkerConsumed\.current/);
    expect(content).toMatch(
      /cataloguePathWithoutAdd\(businessId, searchParams\)/,
    );
  });

  it('takes the route strings from routeConfig', () => {
    expect(content).toMatch(/from '@\/config\/routeConfig'/);
    expect(content).not.toMatch(/['"]\?add=1['"]/);
  });

  it('lets the dialog be driven from outside without losing its trigger', () => {
    expect(dialog).toMatch(/open\?: boolean/);
    expect(dialog).toMatch(/onOpenChange\?: \(open: boolean\) => void/);
    expect(dialog).toMatch(/const isControlled = controlledOpen !== undefined/);
    // The trigger still exists — the deep link is an extra way in, not a
    // replacement for the button.
    expect(dialog).toMatch(/<DialogTrigger asChild>/);
  });
});

describe('the "add your first one" surfaces land on the open form', () => {
  // Three surfaces exist only to get an owner to add their first offering.
  // Landing them on the catalogue page puts a hunt-for-the-button step
  // between declaring intent and acting, and that step is where people stop.
  const FIRST_OFFERING_CTAS = [
    'lib/api/business/onboardingQuery.ts',
    'app/business/[businessId]/home/HomePage.tsx',
    'app/business/[businessId]/shop/components/shop-items.tsx',
  ];

  it.each(FIRST_OFFERING_CTAS)('%s links to the open form', (file) => {
    expect(code(file)).toMatch(/businessAddOfferingPath/);
  });

  it('leaves the "View All" link on the plain catalogue page', () => {
    // Not every catalogue link is an add-first CTA. Opening a dialog over the
    // page for someone who asked to BROWSE it would be an ambush.
    const shopItems = code(
      'app/business/[businessId]/shop/components/shop-items.tsx',
    );
    expect(shopItems).toMatch(/businessProductCataloguesPath/);
  });
});
