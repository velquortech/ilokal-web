import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The gallery layout regressions that DOM tests cannot see.
 *
 * happy-dom has no CSS layout engine, so a grid overflowing a phone — or a
 * photo cropped into a fixed frame — is invisible to a render test. These are
 * source-scan guards for the two ways the gallery layouts broke:
 *
 * 1. Masonry applied desktop column positions (`col-start-3` / `col-start-4`)
 *    at every width, and with the mobile `grid-cols-2` those explicit tracks
 *    made CSS Grid create an implicit third column — the tiles spilled
 *    sideways off a phone.
 * 2. Every tile cropped its photo into a fixed frame (`aspect-square`,
 *    `aspect-video`, or the masonry's `auto-rows-[200px]` + `object-cover`),
 *    damaging the photo's ratio.
 *
 * The fix: every gallery surface renders through `NaturalRatioGallery`, which
 * keeps each photo at its own aspect and flows them as auto-arranging columns.
 * A phone gets 2 columns; desktop gets more. Nothing is ever cropped.
 */

const MASONRY = resolve('components/custom/Masonry.tsx');
const GALLERY = resolve('components/custom/NaturalRatioGallery.tsx');
const SHOP_GALLERY = resolve(
  'app/business/[businessId]/shop/components/shop-gallery.tsx',
);
const INTERIOR_GALLERY = resolve(
  'app/explore/[businessId]/components/interior-gallery.tsx',
);

const read = (path: string) => readFileSync(path, 'utf8');

/**
 * Comments stripped — the comments in these files quote the very layout that
 * was removed (that is what makes them worth reading), and a sweep that fails
 * on its own explanation teaches people to delete the explanation.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('Masonry stays on-screen on a phone', () => {
  const source = read(MASONRY);

  it('is a 2-column gallery on a phone and 4 columns from md', () => {
    // A fixed 4-across row is the old mobile-overflow failure.
    expect(source).toContain('columns-2 gap-3 md:columns-4');
    expect(read(GALLERY)).not.toContain('grid grid-cols-4');
  });

  it('renders through the shared gallery instead of its own Image', () => {
    // One place owns the unoptimized + natural-ratio rules.
    expect(source).toContain('<NaturalRatioGallery');
    expect(source).not.toContain("from 'next/image'");
  });
});

describe('no gallery surface crops a photo', () => {
  const surfaces = [MASONRY, GALLERY, SHOP_GALLERY, INTERIOR_GALLERY];

  it('keeps every tile at its natural aspect ratio', () => {
    expect(read(GALLERY)).toContain('width={0}');
    expect(read(GALLERY)).toContain('height={0}');
    expect(read(GALLERY)).toContain('h-auto w-full');
  });

  it('has no fixed frames or crop fills anywhere in the gallery chain', () => {
    for (const path of surfaces) {
      const src = code(read(path));
      expect(src).not.toMatch(/auto-rows-/);
      expect(src).not.toMatch(/aspect-(square|video)/);
      expect(src).not.toMatch(/object-(cover|contain)/);
    }
  });
});

describe('the small gallery accommodates a phone', () => {
  const source = read(SHOP_GALLERY);

  it('renders 1–3 images through the shared gallery', () => {
    expect(source).toContain('<NaturalRatioGallery');
    // Relies on the shared default: 2-up on a phone, 3-up from sm. The old
    // fixed 3-up row made ~105px thumbs on a 375px screen.
    expect(read(GALLERY)).toContain("'columns-2 gap-3 sm:columns-3'");
  });

  it('lets the label + manage button wrap instead of squeezing', () => {
    expect(source).toContain(
      'flex w-full flex-wrap items-center justify-between',
    );
  });
});
