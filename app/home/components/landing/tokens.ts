import type { CSSProperties } from 'react';

/**
 * Landing theme tokens — a 1:1 port of the design export's `applyTheme()`.
 * The page is styled with CSS custom properties set on the `[data-ilokal-root]`
 * wrapper; toggling dark mode swaps the token set. `--brand`/`--brandhover` are
 * constant across modes. This is self-contained and independent of the app-wide
 * `next-themes` `.dark` class.
 *
 * That independence is DELIBERATE, not an oversight: these tokens are a 1:1 port
 * of the design export and the landing renders none of the shadcn primitives
 * that read the app tokens. Consequences to know before "fixing" it:
 *   - the landing's dark mode is per-visit React state; it does not persist and
 *     it does not follow the OS/system preference;
 *   - toggling here changes nothing outside `[data-ilokal-root]`, and the app's
 *     `next-themes` toggle (e.g. in `CustomerHeader`) changes nothing inside it.
 * Wiring the two together means migrating the landing off these tokens onto the
 * app's `.dark` class — a visual-diff-reviewed branch of its own.
 */

/**
 * Brand v1.0 — Brick Ember. `--brand` is NOT constant across modes any more:
 * Brick Ember on the dark `--bg` (#1A1A1A) measures 3.23:1, so dark mode uses
 * the lifted #DD2920. Read the mode-correct value from `themeTokens`, and use
 * `BRAND` only where the surface is known to be light.
 */
export const BRAND = '#D70005';
export const BRAND_HOVER = '#A80004';
export const BRAND_DARK = '#DD2920';
export const BRAND_DARK_HOVER = '#EF5143';

/** Secondary brand colours, for accents inside landing sections. */
export const JASMINE = '#FEE87B';
export const CORNSILK = '#FEF8D6';
export const PETAL = '#FCD9F7';

type Tokens = Record<string, string>;

export const lightTokens: Tokens = {
  '--bg': '#FBFAF6',
  '--text': '#1A1A1A',
  '--muted': '#716664',
  '--surface': '#FFFFFF',
  '--border': '#E4DEDA',
  '--chip': '#FEF8D6',
  '--tint': 'rgba(215,0,5,0.07)',
  '--shadow': '0 1px 3px rgba(26,10,10,0.06),0 10px 30px rgba(26,10,10,0.06)',
};

export const darkTokens: Tokens = {
  '--bg': '#1A1A1A',
  '--text': '#F7F5EF',
  '--muted': '#A9A49B',
  '--surface': '#272422',
  '--border': '#3A3532',
  '--chip': '#322E2B',
  '--tint': 'rgba(221,41,32,0.16)',
  '--shadow': '0 1px 3px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35)',
};

/**
 * The custom properties alone — no page layout.
 *
 * Any element that hosts a landing component needs these plus `data-ilokal-root`
 * (the attribute every `landing.css` rule is scoped under). Use this when
 * embedding a single piece of landing chrome in another surface; use
 * `rootStyle` when the landing owns the whole page.
 */
export function themeTokens(dark: boolean): CSSProperties {
  return {
    '--brand': dark ? BRAND_DARK : BRAND,
    '--brandhover': dark ? BRAND_DARK_HOVER : BRAND_HOVER,
    '--jasmine': JASMINE,
    '--cornsilk': CORNSILK,
    '--petal': PETAL,
    ...(dark ? darkTokens : lightTokens),
  } as CSSProperties;
}

/** Full root style (tokens + whole-page layout) for the given mode. */
export function rootStyle(dark: boolean): CSSProperties {
  return {
    ...themeTokens(dark),
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'var(--font-sans-brand), Inter, system-ui, sans-serif',
    minHeight: '100vh',
    transition: 'background .35s ease, color .35s ease',
    overflowX: 'hidden',
  } as CSSProperties;
}
