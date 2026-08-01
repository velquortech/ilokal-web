import { describe, it, expect } from 'vitest';
import {
  BRAND_TONES,
  brandToneFor,
  brandToneIndex,
} from '@/lib/utils/brandTone';

/**
 * The whole point of deriving the tone from the id is that a shop keeps its
 * colour: across renders (no hydration mismatch), across pages of the grid, and
 * across surfaces — the card you tapped and the shop page you land on. These
 * tests pin exactly that, plus the junk-input cases, since ids come from the DB
 * and a card that throws takes the whole grid with it.
 */
describe('brandToneIndex', () => {
  it('is deterministic for the same id', () => {
    const id = '11111111-1111-1111-1111-111111111112';
    expect(brandToneIndex(id, 4)).toBe(brandToneIndex(id, 4));
  });

  it('stays inside the bucket range', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `shop-${i}-${i * 7}`);
    for (const id of ids) {
      const idx = brandToneIndex(id, 4);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    }
  });

  it('spreads across every bucket rather than collapsing onto one colour', () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) =>
        brandToneIndex(`business-${i}`, BRAND_TONES.length),
      ),
    );
    expect(seen.size).toBe(BRAND_TONES.length);
  });

  it('handles an empty id and a zero bucket count without throwing', () => {
    expect(brandToneIndex('', 4)).toBe(0);
    expect(brandToneIndex('anything', 0)).toBe(0);
  });
});

describe('brandToneFor', () => {
  it('returns one of the four brand tones', () => {
    expect(BRAND_TONES).toContain(brandToneFor('some-shop-id'));
  });

  it('agrees with brandToneIndex, so surfaces using either share a colour', () => {
    const id = 'aaaaaaaa-0000-0000-0000-000000000001';
    expect(brandToneFor(id)).toBe(
      BRAND_TONES[brandToneIndex(id, BRAND_TONES.length)],
    );
  });

  it('pins the palette to the brand hexes — never a retired colour', () => {
    for (const tone of BRAND_TONES) {
      expect(tone).toMatch(/#(D70005|FEE87B|FCD9F7|FEF8D6)/);
    }
  });
});
