import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The gallery layout regressions that DOM tests cannot see.
 *
 * happy-dom has no CSS layout engine, so a grid overflowing a phone is
 * invisible to a render test. These are source-scan guards for the two ways it
 * broke: Masonry applied desktop column positions (`col-start-3` / `col-start-4`)
 * at every width, and with the mobile `grid-cols-2` those explicit tracks made
 * CSS Grid create an implicit third column — the tiles spilled sideways off a
 * phone. The positions must stay `md:`-scoped, and the shop gallery's simple
 * row must not be a fixed 3-up on a phone.
 */

const MASONRY = resolve('components/custom/Masonry.tsx');
const SHOP_GALLERY = resolve(
  'app/business/[businessId]/shop/components/shop-gallery.tsx',
);

const read = (path: string) => readFileSync(path, 'utf8');

describe('Masonry stays on-screen on a phone', () => {
  const source = read(MASONRY);

  it('is a 2-column grid below md and only 4-column from md up', () => {
    // `grid-cols-4` on its own would put the 4-tile mosaic on a phone; the
    // breakpoint form is the only acceptable one.
    expect(source).toContain('grid-cols-2');
    expect(source).toContain('md:grid-cols-4');
    expect(source).not.toContain('grid grid-cols-4');
  });

  it('scopes every explicit grid position behind md:', () => {
    // Each `position = '…'` assignment: every class must carry the `md:`
    // prefix, so a phone gets plain auto-flow instead of tracks that do not
    // exist on a 2-column grid.
    const assignments = source.match(/position = '[^']+'/g) ?? [];
    expect(assignments.length).toBeGreaterThanOrEqual(8);
    for (const line of assignments) {
      const classes = (line.match(/'([^']*)'/) ?? [])[1].split(' ');
      for (const cls of classes) {
        expect(cls, `${cls} in ${line}`).toMatch(/^md:/);
      }
    }
  });
});

describe('the shop gallery grid accommodates a phone', () => {
  const source = read(SHOP_GALLERY);

  it('renders 1–3 images 2-up on a phone, 3-up from sm', () => {
    expect(source).toContain('grid grid-cols-2 gap-3 sm:grid-cols-3');
    // The old fixed 3-up row made ~105px thumbs on a 375px screen.
    expect(source).not.toContain('grid grid-cols-3 gap-3');
  });

  it('lets the label + manage button wrap instead of squeezing', () => {
    expect(source).toContain(
      'flex w-full flex-wrap items-center justify-between',
    );
  });
});
