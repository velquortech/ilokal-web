import type { CSSProperties } from 'react';

/**
 * Landing theme tokens — a 1:1 port of the design export's `applyTheme()`.
 * The page is styled with CSS custom properties set on the `[data-ilokal-root]`
 * wrapper; toggling dark mode swaps the token set. `--brand`/`--brandhover` are
 * constant across modes. This is self-contained and independent of the app-wide
 * `next-themes` `.dark` class.
 */

export const BRAND = '#65A30D';
export const BRAND_HOVER = '#15803D';

type Tokens = Record<string, string>;

export const lightTokens: Tokens = {
  '--bg': '#FFFFFF',
  '--text': '#1A1A1A',
  '--muted': '#6B7280',
  '--surface': '#FFFFFF',
  '--border': '#E5E7EB',
  '--chip': '#F3F4F6',
  '--tint': 'rgba(101,163,13,0.08)',
  '--shadow': '0 1px 3px rgba(16,24,40,0.06),0 10px 30px rgba(16,24,40,0.06)',
};

export const darkTokens: Tokens = {
  '--bg': '#1A1A1A',
  '--text': '#F5F5F5',
  '--muted': '#9CA3AF',
  '--surface': '#242424',
  '--border': '#353535',
  '--chip': '#2C2C2C',
  '--tint': 'rgba(101,163,13,0.13)',
  '--shadow': '0 1px 3px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35)',
};

/** Full root style (base vars + themed vars) for the given mode. */
export function rootStyle(dark: boolean): CSSProperties {
  const themed = dark ? darkTokens : lightTokens;
  return {
    '--brand': BRAND,
    '--brandhover': BRAND_HOVER,
    ...themed,
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'var(--font-geist-sans), Geist, system-ui, sans-serif',
    minHeight: '100vh',
    transition: 'background .35s ease, color .35s ease',
    overflowX: 'hidden',
  } as CSSProperties;
}
