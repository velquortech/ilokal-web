/**
 * Responsive contract sweep — admin + business dashboards.
 *
 * Every responsive fix this repo has shipped that STUCK was pinned by a sweep
 * like this one (the table-toolbar sweep, the dialog sweep, the brand-green
 * sweep). Class-only fixes are exactly the kind that get undone by an
 * unrelated refactor with nothing to say so, because there is no runtime
 * behaviour to break — the page just quietly stops fitting on a phone again.
 *
 * Scope and growth: this file starts at the checks the shipped phases satisfy
 * and gains one block per phase (see `.claude/RESPONSIVE_PWA.md` §4). A check
 * added before its fix lands is a red suite, not a guardrail.
 *
 * Every assertion here is proven by BREAKING it — revert the fix, watch this
 * file go red on that one test, restore. A sweep nobody has watched fail is a
 * sweep nobody knows is wired up.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative as relativePath } from 'node:path';

const ROOT = process.cwd();

const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/**
 * These files NAME the class they avoid, in prose, directly above the fix
 * ("`h-dvh`, not `h-screen`: ..."). A sweep that matched its own explanation
 * would teach the next person to delete the explanation.
 */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\/[^\n]*/g, '');

/**
 * The same strip, but every removed character is replaced by a space and every
 * newline kept — so offsets and line numbers still address the REAL file.
 *
 * The first version of the scans below stripped normally and reported lines
 * from the shortened text, which named rows that did not exist in the file a
 * human opens. Keying on the class string instead was worse: two cells of the
 * same form produce the same literal, so the coupon dialog's date pair — a
 * genuine defect — collapsed onto its BOGO pair's allowlist entry and the
 * sweep went green with the bug reinstated. That is how this comment came to
 * be written.
 */
const blankComments = (source: string): string => {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
};

/** The two authenticated dashboard shells. Both must obey every rule here. */
const SHELLS = [
  'app/admin/[adminId]/components/AdminLayout.tsx',
  'app/business/[businessId]/components/BusinessLayout.tsx',
] as const;

/** The header of each shell — the only navigation entry point on a phone. */
const HEADERS = [
  'app/admin/[adminId]/components/AdminHeader.tsx',
  'app/business/[businessId]/components/BusinessHeader.tsx',
] as const;

describe('dashboard shells use the dynamic viewport', () => {
  /**
   * `100vh` is TALLER than the visible viewport on a phone while the URL bar
   * is showing. Both shells are `overflow-hidden`, so with `h-screen` the
   * bottom of the content column sits behind the browser chrome — and on a
   * browser whose bar never collapses (an embedded webview, or an installed
   * PWA in some engines) it is simply unreachable. `dvh` tracks the dynamic
   * viewport and is identical to `vh` on desktop, so this costs nothing.
   */
  it.each(SHELLS)('%s sizes with h-dvh, never h-screen', (relative) => {
    const source = stripComments(read(relative));
    expect(source).toMatch(/\bh-dvh\b/);
    expect(source).not.toMatch(/\bh-screen\b/);
  });
});

describe('the sidebar trigger is reachable on a touch screen', () => {
  /**
   * Below `md` the sidebar is a `Sheet` that starts closed, so this button is
   * the ONLY route to navigation. 36px (`h-9`) is under every published touch
   * target minimum; the rule is 44px on touch, dropping to 36px from `md` up
   * where there is a pointer.
   *
   * Asserted as the exact class pair rather than "contains h-11", because
   * `h-11` alone (no `md:` step-down) would pass a looser check while making
   * the desktop header visibly wrong.
   */
  it.each(HEADERS)('%s gives it 44px below md', (relative) => {
    const source = stripComments(read(relative));
    const trigger = source.match(/<SidebarTrigger[^>]*\/>/)?.[0];
    expect(trigger, 'no <SidebarTrigger /> found').toBeTruthy();
    expect(trigger).toMatch(/h-11/);
    expect(trigger).toMatch(/w-11/);
    expect(trigger).toMatch(/md:h-9/);
    expect(trigger).toMatch(/md:w-9/);
  });
});

describe('a phone always shows what product it is in', () => {
  /**
   * Both sidebars print an identity block in their own header, and it is
   * off-screen exactly when it matters: on mobile (the sheet is closed by
   * default) and on desktop while the rail is collapsed. Without a fallback in
   * the header, an admin on a phone sees a hamburger, a bell and a theme
   * toggle and nothing else.
   *
   * The `collapsed ? 'md:flex' : 'md:hidden'` pair is the mechanism: exactly
   * one `md:` display utility is present at a time, so there is no cascade to
   * fight. Asserting the pair — not just the import — is what stops the block
   * being left permanently hidden by a later class edit.
   */
  it.each(HEADERS)('%s falls back to a header identity block', (relative) => {
    const source = stripComments(read(relative));
    expect(source).toMatch(/BrandMark/);
    expect(source).toMatch(/state === 'collapsed' \? 'md:flex' : 'md:hidden'/);
  });
});

/** Every `.tsx` under the two dashboards plus the shared composites. */
function dashboardSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${entry}`;
      if (statSync(join(ROOT, rel)).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(rel);
      } else if (entry.endsWith('.tsx')) {
        out.push(rel);
      }
    }
  };
  walk('app/admin');
  walk('app/business');
  walk('components/custom');
  return out;
}

/**
 * Class-like string literals — `"..."`, `'...'` and `` `...` `` — WITH their
 * offset.
 *
 * The offset is not a nicety: two cells of the same form produce two identical
 * literals (`grid grid-cols-2 gap-2` appears twice in the coupon dialog), and
 * an `indexOf` lookup reports both at the first one's line. The first version
 * of this sweep did exactly that and named a line that had nothing wrong with
 * it.
 */
function classLiterals(source: string): Array<{ text: string; line: number }> {
  // `[\s\S]` rather than `.` with the `s` flag: this repo's tsconfig targets
  // below es2018, where `s` is a compile error (tests transpile fine and only
  // `tsc --noEmit` catches it, which is exactly the kind of drift that gets
  // committed).
  return [...source.matchAll(/(['"`])((?:[^'"`\\]|\\[\s\S])*?)\1/g)].map(
    (m) => ({
      text: m[2],
      line: source.slice(0, m.index).split('\n').length,
    }),
  );
}

/**
 * Grids that are deliberately 2-up all the way down to 320px, each with the
 * reason it is not a defect. Measured, not assumed — at 320px the shell spends
 * 32px and a 16px gap leaves ~136px per cell, which is fine for a three-letter
 * label over a numeric input and wrong for anything wider.
 *
 * The list is the point: a NEW unprefixed grid has to be argued for here
 * rather than merged silently, and the argument is written down where the next
 * person reads it.
 */
const DELIBERATE_TWO_UP: Record<string, string> = {
  'app/business/[businessId]/coupons/components/promo-form-dialog.tsx:355':
    'BOGO Buy/Get — two numeric inputs under three-letter labels.',
  'app/business/[businessId]/coupons/components/promo-form-dialog.tsx:478':
    'Redemption caps — numeric inputs; items-end already handles the two labels wrapping to different heights.',
  'app/business/[businessId]/coupons/components/promo-form-dialog.tsx:551':
    'Coupon/Deal radio cards — two options, each a single short word.',
  'app/business/[businessId]/coupons/components/promo-form-dialog.tsx:617':
    'Draft/Published radio cards — same shape.',
  'app/business/[businessId]/shop/components/shop-legitimacy.tsx:33':
    'Two centred compliance tiles; the label wraps rather than truncating, and stacking would spend the whole fold on two words.',
  'app/business/registration/steps/Deal.tsx:232':
    'BOGO Buy/Get again, on the registration deal step.',
};

describe('no grid drops below a phone without saying why', () => {
  /**
   * A `grid-cols-2` with no breakpoint prefix puts two controls side by side at
   * 320px. That is right for two numeric inputs and wrong for a
   * `datetime-local`, whose native control renders "MM/DD/YYYY, --:-- --" and
   * is simply truncated at ~120px — which is what the coupon dialog shipped
   * until this sweep was written.
   *
   * Comments are stripped FIRST. These files name the class they avoid inside
   * backticks, in prose ("An unprefixed `grid-cols-2` puts Price beside Price
   * Type at 320px"), so a scan that ran before stripping reported the
   * explanation as the defect — it did, while this test was being written.
   */
  it('flags every unprefixed multi-column grid not on the list', () => {
    const found = new Set<string>();

    for (const rel of dashboardSources()) {
      const source = blankComments(read(rel));
      for (const { text, line } of classLiterals(source)) {
        if (!text.includes('grid-cols-')) continue;
        const base = [...text.matchAll(/(?:^|\s)grid-cols-(\d+)/g)].map((m) =>
          Number(m[1]),
        );
        if (!base.some((n) => n >= 2)) continue;
        if (/(sm|md|lg|xl|2xl):grid-cols/.test(text)) continue;

        found.add(`${rel}:${line}`);
      }
    }

    expect([...found].sort()).toEqual(Object.keys(DELIBERATE_TWO_UP).sort());
  });

  it('every deliberate exception carries its reason', () => {
    for (const [key, reason] of Object.entries(DELIBERATE_TWO_UP)) {
      expect(reason.length, `${key} has no reason`).toBeGreaterThan(30);
      // The key has to name a real file AND a line that still carries a grid,
      // or the exception silently outlives the code it was written for.
      const [file, line] = key.split(':');
      const row = read(file).split('\n')[Number(line) - 1] ?? '';
      expect(row, `${key} no longer holds a grid`).toMatch(/grid-cols-/);
    }
  });
});

describe('no dashboard surface spends the whole phone on padding', () => {
  /**
   * `p-20` is 160px of horizontal inset. On a 320px viewport the shell has
   * already spent 32px, so a flat `p-20` leaves 128px of content — the empty
   * state's own buttons wrapped to one word per line. Anything from `p-12` up
   * has to step: small first, generous once there is room.
   */
  it('steps any padding of p-12 or larger', () => {
    const found: string[] = [];

    for (const rel of dashboardSources()) {
      const source = blankComments(read(rel));
      for (const { text, line } of classLiterals(source)) {
        if (!/(?:^|\s)(?:p|px)-(?:1[2-9]|2\d)\b/.test(text)) continue;
        if (/(?:sm|md|lg|xl):(?:p|px)-/.test(text)) continue;
        found.push(`${rel}:${line}`);
      }
    }

    expect(found).toEqual([]);
  });
});

describe('page headings come from one component', () => {
  /**
   * `PageHeader` sizes its title with `clamp(1.75rem, 2.4vw, 2.25rem)` and puts
   * its action slot in a wrapping row. A hand-rolled `text-3xl font-bold
   * tracking-tight` does neither: it stays 30px at 320px, and the button beside
   * it — laid out in whatever flex row the page happened to write — has nothing
   * telling it to wrap.
   *
   * That is why this is a responsive check and not a styling preference. It is
   * also what kept the admin dashboard reading as a different product from the
   * rest of the app: `PageHeader` is where the display face is applied.
   *
   * Scoped to the exact replaced recipe rather than "any h1", because a card or
   * a detail pane can legitimately own a smaller heading of its own — two
   * `text-xl font-semibold` h1s in the branch surfaces are exactly that.
   */
  it('no dashboard file hand-rolls the page-title recipe', () => {
    const found: string[] = [];

    for (const rel of dashboardSources()) {
      const source = blankComments(read(rel));
      for (const { text, line } of classLiterals(source)) {
        if (!/\btext-3xl\b/.test(text)) continue;
        if (!/\bfont-bold\b/.test(text)) continue;
        if (!/\btracking-tight\b/.test(text)) continue;
        found.push(`${rel}:${line}`);
      }
    }

    expect(found).toEqual([]);
  });
});

describe('every dashboard table is usable on a phone', () => {
  /**
   * A seven- or nine-column table on a 375px screen is not "scrollable", it is
   * hidden: `components/ui/table.tsx` wraps every table in `overflow-x-auto`,
   * so nothing is lost — but the actions column is last in every one of these,
   * which means the button that approves a shop, sends a reminder or deletes a
   * branch is off-screen behind a scroll most people never discover.
   *
   * The fix is the shared `DataTable`'s `renderMobile`: one TanStack instance,
   * two renderers, cells reused through `flexRender`. So sorting, pagination
   * and selection stay single-source and a card can never render differently
   * from its own column.
   *
   * This asserts adoption, not existence — the mechanism has been in
   * `DataTable` for a while and four business tables used it while every admin
   * table did not.
   */
  it('every DataTable mount supplies a mobile renderer', () => {
    const missing: string[] = [];

    for (const rel of dashboardSources()) {
      const source = blankComments(read(rel));
      // The mount, not the import, and not `<DataTablePagination`.
      const mount = /<DataTable[\s\n]/.exec(source);
      if (!mount) continue;
      if (!source.includes('renderMobile')) missing.push(rel);
    }

    expect(missing).toEqual([]);
  });

  /**
   * The other half: nobody hand-rolls a table any more.
   *
   * Three files used to build their own TanStack instance plus their own
   * `<Table>` markup, so every responsive fix made to the shared composite had
   * to be made three more times — and was not. `useReactTable` outside the
   * shared composite is that fork starting again.
   */
  it('no dashboard file builds its own table', () => {
    const forks: string[] = [];

    for (const rel of dashboardSources()) {
      // The shared composite is the ONE place a table is built.
      if (rel === 'components/custom/data-table/DataTable.tsx') continue;
      if (blankComments(read(rel)).includes('useReactTable')) forks.push(rel);
    }

    /**
     * Empty, and it stays empty.
     *
     * All four forks are gone. The last one — `UsersTable`, 654 lines across
     * five files — needed the composite widened first (an optional
     * column-visibility hook, an opt-out of `manualSorting`, a render-prop
     * toolbar and a switch for the rows-per-page control), which is why it
     * went last rather than first.
     */
    expect(forks).toEqual([]);
  });
});

/**
 * Icon-only controls that stay 36px on touch, each with the reason.
 *
 * All four are corner badges absolutely positioned over the thumbnail they
 * remove. At 44px the circle covers a visible share of the image it is
 * attached to, and the tile itself is already the large target — so bigger is
 * genuinely worse here, which is why `icon-touch` is a named size rather than
 * a change to `icon` itself.
 */
const SMALL_BY_DESIGN = [
  'app/business/[businessId]/branches/create/steps/step-branch-images.tsx',
  'app/business/registration/steps/Gallery.tsx',
];

describe('icon-only actions are reachable with a thumb', () => {
  /**
   * 36px (`size="icon"`) is fine for a pointer and too small for a thumb, and
   * it matters more than it used to: the dashboards now render card lists
   * below `md`, so the kebab that approves a shop or deletes a branch is a
   * PRIMARY control on a phone rather than something off the right edge of a
   * table. `icon-touch` is 44px on touch, 36px from `md`.
   *
   * Matched on the size classes rather than on `size="icon"` alone, because
   * every one of these sites originally carried its own `h-8 w-8` / `size-7`
   * override — which `tailwind-merge` lets win over the variant, so a variant
   * change alone would have fixed none of them.
   */
  it('no dashboard action button is under 44px on touch', () => {
    const small: string[] = [];

    for (const rel of dashboardSources()) {
      const source = blankComments(read(rel));
      // error below this repo's tsconfig target (es2018). Vitest transpiles
      // without typechecking, so only `tsc --noEmit` catches it.
      for (const tag of source.match(/<Button\b[^>]{0,400}?>/g) ?? []) {
        // No `s` flag: `[^>]` already matches newlines, and `s` is a compile
        if (tag.includes('icon-touch')) continue;
        const isIcon = tag.includes('size="icon"') || /\bsize-\d/.test(tag);
        if (!isIcon) continue;
        const hasOwnSize = /\b(size|h)-\d/.test(tag);
        const isSmall = /\b(size|h)-(7|8|9|10)\b/.test(tag);
        if (hasOwnSize && !isSmall) continue;
        // A control that already steps down at a breakpoint is doing the right
        // thing by hand (the sidebar trigger and the pager predate the size).
        if (/\b(sm|md|lg):(size|h)-/.test(tag)) continue;
        small.push(rel);
      }
    }

    expect([...new Set(small)].sort()).toEqual(SMALL_BY_DESIGN);
  });

  it('the named size exists and steps down at md', () => {
    const button = read('components/ui/button.tsx');
    expect(button).toContain("'icon-touch': 'size-11 md:size-9'");
  });
});

describe('the sweep is actually looking at something', () => {
  /**
   * A sweep that matches nothing passes silently, which is the failure mode a
   * sweep exists to catch — the upload rate-limit contract test learned this
   * the same way. If a shell is renamed or moved, this fails loudly instead of
   * quietly guarding an empty set.
   */
  it('resolves every file it claims to guard', () => {
    for (const relative of [...SHELLS, ...HEADERS]) {
      expect(read(relative).length, `${relative} is empty`).toBeGreaterThan(
        200,
      );
    }
    expect(SHELLS.length + HEADERS.length).toBe(4);
  });

  /**
   * A sweep that matches nothing passes silently. If the walk breaks — a
   * moved directory, a rename — every scan above turns into a guarantee about
   * an empty set, which is the failure mode the upload rate-limit sweep was
   * built to avoid.
   */
  it('walks the whole dashboard tree', () => {
    const files = dashboardSources();
    expect(files.length).toBeGreaterThan(150);
    expect(files.some((f) => f.startsWith('app/admin/'))).toBe(true);
    expect(files.some((f) => f.startsWith('app/business/'))).toBe(true);
    expect(relativePath('.', '.')).toBe('');
  });
});
