/**
 * Mobile tab bar contract sweep.
 *
 * The bar replaces the sidebar as primary navigation on the installed
 * business dashboard, and every rule it depends on is a CLASS — which means
 * none of it has runtime behaviour to break, and all of it can be undone by an
 * unrelated refactor with nothing to say so.
 *
 * One assertion here guards more than layout. The bar appears under the
 * `standalone:` variant and the hamburger DISAPPEARS under it, so if those two
 * conditions ever drift the result is either two controls doing one job or —
 * the bad direction — a screen with no way into navigation at all. They are
 * asserted as the same condition, not merely as "present".
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * These files name the classes they avoid in prose. A sweep that ran before
 * stripping would pass on its own explanation, and keep passing after someone
 * deleted the code and left the comment.
 */
const blankComments = (source: string): string => {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
};

const TAB_BAR = 'app/business/[businessId]/components/BusinessTabBar.tsx';
const HEADER = 'app/business/[businessId]/components/BusinessHeader.tsx';
const LAYOUT = 'app/business/[businessId]/components/BusinessLayout.tsx';
const PROMPT = 'components/custom/pwa/InstallPrompt.tsx';
const CSS = 'app/globals.css';

describe('the standalone variant', () => {
  const css = read(CSS);

  it('is defined, and covers the iOS fallback as well as the media query', () => {
    expect(css).toContain('@custom-variant standalone');
    // The spec-correct signal.
    expect(css).toMatch(/@media \(display-mode: standalone\)/);
    // Older iOS home-screen apps do not match that query and expose
    // `navigator.standalone` instead; without this branch the bar would
    // simply never appear on those devices, silently.
    expect(css).toContain('[data-standalone]');
  });
});

describe('the bar is decided in CSS, never in JavaScript', () => {
  /**
   * 🔴 The whole design rests on this.
   *
   * `navigator.standalone` and `matchMedia` are client-only, so a JS gate
   * renders the wrong thing during SSR and corrects after hydration — a
   * visible jump on every cold launch of the installed app, which is the one
   * place this feature is ever seen. A media query has no hydration step: the
   * server ships the same HTML either way.
   */
  it('the tab bar reads no client-only display signal', () => {
    const source = blankComments(read(TAB_BAR));
    expect(source).not.toMatch(/matchMedia/);
    expect(source).not.toMatch(/navigator\.standalone/);
    expect(source).not.toMatch(/useIsMobile/);
  });

  it('paints only in a standalone window on a small screen', () => {
    const source = blankComments(read(TAB_BAR));
    // Hidden by default, shown by the variant, withdrawn again at `md` where
    // the sidebar is permanently visible.
    expect(source).toMatch(/\bhidden\b/);
    expect(source).toMatch(/standalone:flex/);
    expect(source).toMatch(/standalone:md:hidden/);
  });
});

describe('exactly one navigation control, never two and never none', () => {
  /**
   * The hamburger is the ONLY route to navigation in a normal mobile browser
   * tab, where the bar does not paint. So it is hidden under precisely the
   * condition that shows the bar — and asserting both use `standalone:` is
   * what stops a future edit from removing it unconditionally and stranding
   * every mobile-web visitor.
   */
  it('the hamburger hides under the same condition the bar appears', () => {
    const header = blankComments(read(HEADER));
    const trigger = header.match(/<SidebarTrigger[^>]*\/>/)?.[0];
    expect(
      trigger,
      'no <SidebarTrigger /> in the business header',
    ).toBeTruthy();

    expect(trigger).toMatch(/standalone:hidden/);
    // ...and comes back at `md`, where the bar has withdrawn.
    expect(trigger).toMatch(/standalone:md:inline-flex/);
    // The touch-target rule from the responsive pass still holds.
    expect(trigger).toMatch(/h-11/);
    expect(trigger).toMatch(/md:h-9/);
  });
});

describe('nothing sits underneath the bar', () => {
  it('the content column reserves the bar height under the same condition', () => {
    const layout = blankComments(read(LAYOUT));
    expect(layout).toMatch(/standalone:pb-\[/);
    // The home-indicator inset is part of the reservation, not decoration:
    // without it the last table row is under the indicator on an iPhone.
    expect(layout).toContain('env(safe-area-inset-bottom)');
    expect(layout).toMatch(/standalone:md:pb-6/);
  });

  it('the install prompt lifts above the bar', () => {
    const prompt = blankComments(read(PROMPT));
    expect(prompt).toMatch(/standalone:bottom-14/);
    expect(prompt).toMatch(/standalone:md:bottom-0/);
  });

  it('the bar itself clears the home indicator', () => {
    const source = blankComments(read(TAB_BAR));
    expect(source).toContain('env(safe-area-inset-bottom)');
  });
});

describe('the four tabs', () => {
  const source = blankComments(read(TAB_BAR));

  it('routes through routeConfig, never a literal path', () => {
    expect(source).toContain('businessPath');
    // A literal would not carry the business id and would break the moment a
    // segment is renamed — the rule `config/routeConfig.ts` exists for.
    expect(source).not.toMatch(/href="\/business/);
    expect(source).toContain("'product-catalogues'");
    expect(source).toContain("'redeemed-coupons'");
  });

  it('labels the offerings tab from the shop vocabulary', () => {
    // A tab reading "Products" in a salon is the exact defect the vocabulary
    // system exists to prevent.
    expect(source).toContain('useOfferingVocabulary');
    expect(source).toMatch(/vocabulary\.plural/);
  });

  it('never ships an icon without a label', () => {
    // Four unlabelled glyphs are a memory test, and "Redeem" has no
    // widely-known icon convention.
    expect(source).toContain("'Home'");
    expect(source).toContain("'Redeem'");
    expect(source).toContain('>More<');
  });

  it('marks the active tab for assistive tech, not by colour alone', () => {
    expect(source).toContain('aria-current');
  });

  it('gives every tab a real touch target', () => {
    // `min-h-14` is 56px, comfortably over the 44px floor, and the whole cell
    // is the target rather than the icon.
    expect(source).toMatch(/min-h-14/);
    expect(source).toMatch(/flex-1/);
  });

  it('treats More as a disclosure, not a destination', () => {
    // It opens the existing sidebar sheet, so it is a button with
    // `aria-expanded` — a link would navigate somewhere that does not exist.
    expect(source).toMatch(/aria-expanded=\{openMobile\}/);
    expect(source).toMatch(/setOpenMobile/);
    // And it must not claim a relationship it cannot point at: the sheet is
    // rendered by the shared primitive and has no id here.
    expect(source).not.toMatch(/aria-controls=/);
  });

  it('does not fork the nav config', () => {
    // "More" opens `BusinessSidebar`'s sheet, which already renders
    // SIDEBAR_SECTIONS and already filters on the feature flags. A second
    // hand-written list is how the flag-gated Events entry starts appearing
    // in one place and not the other.
    expect(source).not.toContain('SIDEBAR_SECTIONS');
    expect(source).not.toContain('storeNavigation');
  });
});

describe('the sweep is looking at something', () => {
  it('resolves every file it guards', () => {
    for (const rel of [TAB_BAR, HEADER, LAYOUT, PROMPT, CSS]) {
      expect(read(rel).length, `${rel} is empty`).toBeGreaterThan(200);
    }
  });
});
