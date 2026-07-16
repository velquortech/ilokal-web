import type { CSSProperties } from 'react';

/**
 * Convert a verbatim CSS declaration string (`"a:b;c:d"`) into a React style
 * object — preserves CSS custom properties (`--var`) and camelCases standard
 * properties. Pure (type-only React import); reusable anywhere inline design
 * tokens are pasted verbatim (e.g. the marketing landing sections).
 *
 * Results are memoized by input string — callers pass (mostly static) literals
 * on every render, so re-parsing each render is wasted work during animations.
 */
const cache = new Map<string, CSSProperties>();

export function styleFromString(css: string): CSSProperties {
  const cached = cache.get(css);
  if (cached) return cached;

  const out: Record<string, string> = {};
  for (const rule of css.split(';')) {
    const i = rule.indexOf(':');
    if (i === -1) continue;
    const key = rule.slice(0, i).trim();
    if (!key) continue;
    const val = rule.slice(i + 1).trim();
    const prop = key.startsWith('--')
      ? key
      : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[prop] = val;
  }
  // CSS custom properties are not part of the CSSProperties index signature.
  const style = out as unknown as CSSProperties;
  cache.set(css, style);
  return style;
}
