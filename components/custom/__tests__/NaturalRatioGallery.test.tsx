// @vitest-environment happy-dom

/**
 * NaturalRatioGallery — the shared owner of the natural-ratio + `unoptimized`
 * rules for every interior-photo surface (the owner's shop page, the public
 * "Inside the shop", and `Masonry` for 4+).
 *
 * Layout and attribute behaviour is asserted on static markup (presentational
 * component — same approach as BrandLogo.test.tsx); the click → index wiring
 * is exercised with react-dom/client, the same stack as GlobalSearch.test.tsx.
 *
 * The critical contract under test: with `unoptimized`, `next/image` emits the
 * storage URL verbatim (no `/_next/image` proxy) — routing storage WebP through
 * the optimizer is exactly the bug that used to blank these images.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NaturalRatioGallery } from '@/components/custom/NaturalRatioGallery';

// React 19 requires this flag before `act()` will run (react-dom/client under
// happy-dom — same requirement GlobalSearch.test.tsx's stack satisfies).
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE =
  'https://cdn.ilokal.test/storage/v1/object/public/interior-images';

/** `n` storage-backed tiles, each a distinct WebP path. */
const images = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    src: `${STORAGE}/shop/interior-${i + 1}.webp`,
    alt: `Interior ${i + 1}`,
  }));

describe('NaturalRatioGallery — layout by image count', () => {
  for (const n of [1, 2, 3, 4, 6]) {
    it(`renders exactly ${n} natural-ratio tiles for ${n} images`, () => {
      const html = renderToStaticMarkup(
        <NaturalRatioGallery images={images(n)} />,
      );

      // One tile per image, each carrying its own aspect (no fixed frame):
      // next/image emits width/height 0 and the tile's `h-auto w-full` does
      // the sizing — a crop into `aspect-*` + `object-cover` is the regression
      // this component exists to prevent.
      expect(html.match(/<img/g)).toHaveLength(n);
      expect(html.match(/width="0"/g)).toHaveLength(n);
      expect(html.match(/h-auto w-full/g)).toHaveLength(n);

      // Default columns: 2-up on a phone, 3-up from `sm` (never a fixed
      // 4-across grid, which is what overflowed on mobile before).
      expect(html).toContain('columns-2 gap-3 sm:columns-3');
    });
  }

  it('renders plain tiles (divs) unless onTileClick makes them interactive', () => {
    const html = renderToStaticMarkup(
      <NaturalRatioGallery images={images(2)} />,
    );
    expect(html).not.toContain('<button');
    expect(html.match(/<div/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('applies a custom responsive column layout (Masonry: 2-up phone, 4-up md)', () => {
    const html = renderToStaticMarkup(
      <NaturalRatioGallery
        images={images(4)}
        columnsClassName="columns-2 gap-3 md:columns-4 md:gap-6"
        tileClassName="mb-3 border border-border md:mb-6"
      />,
    );
    expect(html).toContain('columns-2 gap-3 md:columns-4 md:gap-6');
    expect(html).toContain('mb-3 border border-border md:mb-6');
    expect(html).not.toContain('sm:columns-3');
  });
});

describe('NaturalRatioGallery — unoptimized storage contract', () => {
  it('emits every storage URL verbatim — never through the /_next/image proxy', () => {
    const html = renderToStaticMarkup(
      <NaturalRatioGallery images={images(3)} />,
    );
    expect(html).not.toContain('/_next/image');
    for (const img of images(3)) {
      expect(html).toContain(`src="${img.src}"`);
    }
  });
});

describe('NaturalRatioGallery — loading strategy', () => {
  it('lazy-loads every tile by default', () => {
    const html = renderToStaticMarkup(
      <NaturalRatioGallery images={images(4)} />,
    );
    expect(html.match(/loading="lazy"/g)).toHaveLength(4);
    expect(html).not.toContain('loading="eager"');
  });

  it('loads the first eagerCount tiles eagerly and the rest lazily', () => {
    // Masonry passes eagerCount={4}: the above-the-fold rows render eagerly.
    const html = renderToStaticMarkup(
      <NaturalRatioGallery images={images(6)} eagerCount={4} />,
    );
    expect(html.match(/loading="eager"/g)).toHaveLength(4);
    expect(html.match(/loading="lazy"/g)).toHaveLength(2);
  });
});

describe('NaturalRatioGallery — per-tile overlay', () => {
  it('invokes the overlay for every tile with its index and renders the result', () => {
    const overlay = vi.fn((i: number) => <span data-index={i}>chip {i}</span>);
    const html = renderToStaticMarkup(
      <NaturalRatioGallery images={images(3)} overlay={overlay} />,
    );

    expect(overlay).toHaveBeenCalledTimes(3);
    expect(overlay.mock.calls.map(([i]) => i)).toEqual([0, 1, 2]);
    expect(html.match(/chip \d/g)).toHaveLength(3);
  });

  it('renders the "+N more" chip only on the last preview tile (interior-gallery pattern)', () => {
    // 6 photos, 4 previewed — the "+2 more" chip sits on tile 4 only; the
    // hidden ones stay reachable through the lightbox the overlay opens.
    const preview = images(6).slice(0, 4);
    const html = renderToStaticMarkup(
      <NaturalRatioGallery
        images={preview}
        overlay={(i) =>
          i === preview.length - 1 ? (
            <span>+2 more</span>
          ) : (
            <span className="hover-scrim" />
          )
        }
      />,
    );

    expect(html.match(/\+2 more/g)).toHaveLength(1);
    expect(html.match(/hover-scrim/g)).toHaveLength(3);
  });
});

describe('NaturalRatioGallery — interactive tiles', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders a labelled button per tile when onTileClick is provided', () => {
    const html = renderToStaticMarkup(
      <NaturalRatioGallery
        images={images(2)}
        onTileClick={() => {}}
        ariaLabel={(i) => `Open photo ${i + 1} of 2`}
      />,
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.match(/type="button"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Open photo 1 of 2"');
    expect(html).toContain('aria-label="Open photo 2 of 2"');
  });

  it('reports the clicked tile index', () => {
    const onTileClick = vi.fn();
    act(() => {
      root.render(
        <NaturalRatioGallery
          images={images(4)}
          onTileClick={onTileClick}
          ariaLabel={(i) => `photo ${i + 1}`}
        />,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(4);

    act(() => {
      buttons[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onTileClick).toHaveBeenCalledWith(2);
  });
});
