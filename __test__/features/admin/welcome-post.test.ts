/**
 * The welcome-post generator (`.claude/WELCOME_POSTS.md`).
 *
 * The renderer itself is Satori's problem. What is ours is the text handling —
 * a name pulled straight from the database, where the live rows run 3 to 29
 * characters, three carry a trailing space, three are already ALL CAPS and one
 * contains an accent — and the fallbacks that stop one bad row breaking an
 * image.
 */

import { describe, it, expect } from 'vitest';
import {
  clampNameScale,
  displayName,
  initials,
  nameFontSize,
  NAME_LINE_HEIGHT,
  NAME_SCALE_DEFAULT,
  NAME_SCALE_MAX,
  NAME_SCALE_MIN,
  POST_RATIOS,
  sharedNameBoxHeight,
} from '@/lib/og/welcomePost';
import { adminWelcomePostsPath } from '@/config/routeConfig';
import { isVariableFont } from '@/lib/og/fonts';
import { readFileSync } from 'node:fs';

/**
 * A minimal sfnt with the given table tags.
 *
 * Synthesised rather than read from a real variable font: `Pally-Variable.ttf`
 * is not committed (it does not work, so committing it would only invite
 * someone to wire it up), and a test that depends on an untracked file passes
 * locally and fails in CI.
 */
function sfnt(tags: string[]): Buffer {
  const buf = Buffer.alloc(12 + tags.length * 16);
  buf.writeUInt32BE(0x00010000, 0);
  buf.writeUInt16BE(tags.length, 4);
  tags.forEach((tag, i) => buf.write(tag.padEnd(4), 12 + i * 16, 4, 'latin1'));
  return buf;
}

/** Verbatim from the live cloud rows, trailing spaces and all. */
const LIVE_NAMES = [
  'Suds & Sips Carwash and Café ',
  'GigaGrind iCafe & Services',
  'La Marings Restaurant ',
  'INTRA HUB PHILIPPINES ',
  'DIWA COFFEE HOUSE',
  'Gugma Salon & Spa',
  'EM Finds',
  'LU2',
];

describe('displayName', () => {
  it('drops the trailing space three of the live rows carry', () => {
    // Centred text with a trailing space sits visibly off-axis.
    expect(displayName('La Marings Restaurant ')).toBe('LA MARINGS RESTAURANT');
    expect(displayName(' EM Finds ')).toBe('EM FINDS');
  });

  it('collapses internal runs of whitespace', () => {
    expect(displayName('Gugma   Salon  &  Spa')).toBe('GUGMA SALON & SPA');
  });

  it('uppercases everything, so the already-caps rows stay consistent', () => {
    // Three live names are already caps. Transforming all of them is what
    // stops the card set looking mixed.
    expect(displayName('Gugma Salon & Spa')).toBe('GUGMA SALON & SPA');
    expect(displayName('DIWA COFFEE HOUSE')).toBe('DIWA COFFEE HOUSE');
  });

  it('keeps the accent rather than stripping it', () => {
    // Satori falls back per glyph, so the accent renders. Mangling the name to
    // dodge a font problem would be the wrong fix.
    expect(displayName('Suds & Sips Carwash and Café ')).toContain('CAFÉ');
  });

  it('never returns leading or trailing whitespace for any live row', () => {
    for (const name of LIVE_NAMES) {
      const shown = displayName(name);
      expect(shown).toBe(shown.trim());
      expect(shown.length).toBeGreaterThan(0);
    }
  });
});

describe('nameFontSize', () => {
  const CARD = 432;

  it('shrinks as the name grows', () => {
    // A single size cannot serve `LU2` and a 29-character name; the long one
    // overflows and the short one looks lost.
    const short = nameFontSize('LU2', CARD);
    const medium = nameFontSize('Gugma Salon & Spa', CARD);
    const long = nameFontSize('Suds & Sips Carwash and Café', CARD);

    expect(short).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(long);
  });

  it('measures the DISPLAY form, not the raw string', () => {
    // Otherwise a trailing space could tip a name into a smaller bucket.
    expect(nameFontSize('La Marings Restaurant ', CARD)).toBe(
      nameFontSize('La Marings Restaurant', CARD),
    );
  });

  it('keeps every live name inside a sane range', () => {
    for (const name of LIVE_NAMES) {
      const size = nameFontSize(name, CARD);
      expect(size).toBeGreaterThan(CARD * 0.04);
      expect(size).toBeLessThan(CARD * 0.13);
    }
  });

  it('scales with the card, so the 4:5 layout is not hardcoded to 1:1', () => {
    expect(nameFontSize('EM Finds', 600)).toBeGreaterThan(
      nameFontSize('EM Finds', 400),
    );
  });
});

describe('initials — the fallback when a logo cannot be fetched', () => {
  it('uses first and last word, not the first two letters', () => {
    // Satori fetches each logo; one 404 would otherwise fail the whole image.
    expect(initials('Suds & Sips Carwash and Café')).toBe('SC');
    expect(initials('Gugma Salon & Spa')).toBe('GS');
  });

  it('handles a single word', () => {
    expect(initials('LU2')).toBe('L');
    expect(initials('KantoSisig')).toBe('K');
  });

  it('never returns an empty string', () => {
    for (const name of [...LIVE_NAMES, '', '   ', '!!!']) {
      expect(initials(name).length).toBeGreaterThan(0);
    }
  });
});

describe('ratios', () => {
  it('offers exactly the two that cover all four platforms', () => {
    // 1:1 renders correctly on Facebook, Instagram, Threads and LinkedIn; 4:5
    // buys feed height where it matters. 1.91:1 is for link previews, which
    // this is not, and 9:16 is stories.
    expect(Object.keys(POST_RATIOS)).toEqual(['1x1', '4x5']);
  });

  it('is square and portrait, at Instagram’s pixel width', () => {
    expect(POST_RATIOS['1x1']).toMatchObject({ width: 1080, height: 1080 });
    expect(POST_RATIOS['4x5']).toMatchObject({ width: 1080, height: 1350 });
  });
});

describe('the dashboard prompt links somewhere useful', () => {
  it('preselects the shops it is prompting about', () => {
    // Landing on an empty picker makes the admin redo the selection the
    // prompt just made.
    expect(adminWelcomePostsPath('admin-1', ['a', 'b'])).toBe(
      '/admin/admin-1/welcome-posts?ids=a,b',
    );
  });

  it('omits the query when there is nothing to preselect', () => {
    expect(adminWelcomePostsPath('admin-1')).toBe(
      '/admin/admin-1/welcome-posts',
    );
    expect(adminWelcomePostsPath('admin-1', [])).toBe(
      '/admin/admin-1/welcome-posts',
    );
  });
});

describe('the font guard', () => {
  it('rejects a variable font, which would fail the render rather than degrade', () => {
    // Satori throws part-way through parsing one. Fontshare's Pally zip ships
    // `Pally-Variable.ttf` beside the static cuts and it is the easier file to
    // grab by mistake — this was hit for real.
    expect(isVariableFont(sfnt(['glyf', 'fvar', 'gvar']))).toBe(true);
  });

  it('passes a static font through', () => {
    expect(isVariableFont(sfnt(['cmap', 'glyf', 'head', 'loca']))).toBe(false);
  });

  it('does not mistake a woff2 for a variable font', () => {
    // woff2 is not a bare sfnt, so the table scan reads nonsense from it. It
    // has to fail safe rather than throw or report a false positive.
    const woff2 = readFileSync('assets/fonts/Pally-Bold.woff2');
    expect(isVariableFont(woff2)).toBe(false);
  });

  it('fails safe on junk rather than throwing', () => {
    // A truncated or corrupt file must not take out the whole route.
    expect(isVariableFont(Buffer.alloc(0))).toBe(false);
    expect(isVariableFont(Buffer.from('not a font'))).toBe(false);
    expect(isVariableFont(Buffer.alloc(4000))).toBe(false);
  });
});

describe('a pair of cards ends at the same height', () => {
  it('sizes the name box from the LARGEST name in the pair', () => {
    // Each card sizing its own box makes a short name — bigger font, taller
    // box — produce a taller card than the long name beside it, and the pair
    // reads as broken. Caught in a real render.
    const pair = [
      { name: 'Suds & Sips Carwash and Café', logoUrl: null, showName: true },
      { name: 'LU2', logoUrl: null, showName: true },
    ];
    const shared = sharedNameBoxHeight(pair, 432, 1);

    // LU2 takes the larger font, so it sets the shared height.
    expect(shared).toBe(
      Math.round(nameFontSize('LU2', 432, 1) * NAME_LINE_HEIGHT * 2),
    );
    // And it is at least what the long name needs.
    expect(shared).toBeGreaterThanOrEqual(
      Math.round(
        nameFontSize('Suds & Sips Carwash and Café', 432, 1) *
          NAME_LINE_HEIGHT *
          2,
      ),
    );
  });

  it('ignores cards whose name is switched off', () => {
    const pair = [
      { name: 'LU2', logoUrl: null, showName: false },
      { name: 'Gugma Salon & Spa', logoUrl: null, showName: true },
    ];
    expect(sharedNameBoxHeight(pair, 432, 1)).toBe(
      Math.round(
        nameFontSize('Gugma Salon & Spa', 432, 1) * NAME_LINE_HEIGHT * 2,
      ),
    );
  });

  it('collapses to nothing when no card shows a name', () => {
    const pair = [
      { name: 'LU2', logoUrl: null, showName: false },
      { name: 'EM Finds', logoUrl: null, showName: false },
    ];
    expect(sharedNameBoxHeight(pair, 432, 1)).toBe(0);
  });
});

describe('the manual size adjuster', () => {
  it('scales the ladder', () => {
    const base = nameFontSize('Gugma Salon & Spa', 432);
    expect(nameFontSize('Gugma Salon & Spa', 432, 1.4)).toBeGreaterThan(base);
    expect(nameFontSize('Gugma Salon & Spa', 432, 0.7)).toBeLessThan(base);
  });

  it('clamps a value that would break the layout', () => {
    // The slider is bounded, but this is also a query parameter — a caller can
    // send anything.
    expect(clampNameScale(99)).toBe(NAME_SCALE_MAX);
    expect(clampNameScale(-4)).toBe(NAME_SCALE_MIN);
    expect(clampNameScale(Number.NaN)).toBe(NAME_SCALE_DEFAULT);
  });

  it('long names still wrap rather than overflow at full scale', () => {
    // At 1.5x the longest live name must still fit two lines in the card.
    const size = nameFontSize('Suds & Sips Carwash and Café', 432, 1.5);
    expect(size).toBeLessThan(432 * 0.13);
  });
});
