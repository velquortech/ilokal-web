/**
 * Stable per-row brand tone.
 *
 * Explore paints shops and deals in the four brand colours. Which colour a row
 * gets must be DERIVED FROM ITS ID, never random: with `Math.random()` a card
 * changes colour on every render and reshuffles under the reader as they
 * paginate, and the server and client renders would disagree during hydration.
 *
 * The hash lives here rather than in each card because three surfaces need the
 * same answer for the same id — the directory card, the deals wall and the shop
 * page hero. A shop that is Jasmine in the grid must still be Jasmine when you
 * open it, otherwise the colour is decoration instead of identity.
 *
 * Callers own their own class strings (the deal card carries extra custom
 * properties for its rules and dimmed text); only the index is shared.
 */
export function brandToneIndex(id: string, buckets: number): number {
  if (buckets <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum % buckets;
}

/**
 * The four tones as background/foreground pairs, in the order every surface
 * uses: Brick Ember, Jasmine, Petal Frost, Cornsilk.
 *
 * Raw hex rather than tokens on purpose — these are brand moments with no
 * semantic token, and they must stay the same colour in dark mode (a Jasmine
 * card is Jasmine at 7am and at 11pm). Charcoal text on the three light tones
 * measures ≥ 14:1; Cornsilk on Brick Ember is 5.4:1.
 */
export const BRAND_TONES = [
  'bg-[#D70005] text-[#FEF8D6]',
  'bg-[#FEE87B] text-[#1A1A1A]',
  'bg-[#FCD9F7] text-[#1A1A1A]',
  'bg-[#FEF8D6] text-[#1A1A1A]',
] as const;

/** The tone classes for an id, using {@link BRAND_TONES}. */
export function brandToneFor(id: string): string {
  return BRAND_TONES[brandToneIndex(id, BRAND_TONES.length)];
}
