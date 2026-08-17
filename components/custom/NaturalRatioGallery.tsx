'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SafeImage } from './SafeImage';

type Tile = {
  src: string;
  alt: string;
};

type NaturalRatioGalleryProps = {
  images: Tile[];
  /** Column classes — the responsive count lives here (e.g. `columns-2 sm:columns-3`). */
  columnsClassName?: string;
  /** Per-tile classes — the vertical gap (and any tile border) lives here. */
  tileClassName?: string;
  /** How many leading tiles load eagerly (above-the-fold). */
  eagerCount?: number;
  /** Makes tiles buttons and reports clicks by index (lightbox open). */
  onTileClick?: (index: number) => void;
  /** Per-tile ARIA label when interactive. */
  ariaLabel?: (index: number) => string;
  /** Per-tile overlay, e.g. the "+N more" chip or the hover scrim. */
  overlay?: (index: number) => ReactNode;
};

/**
 * Natural-ratio gallery: photos keep their own aspect (nothing is cropped into
 * a fixed frame) and flow as auto-arranging columns.
 *
 * Every gallery that shows interior photos renders through this — the owner's
 * shop page, the public "Inside the shop", and `Masonry` for 4+ — so the
 * natural-ratio rule lives here, and the `unoptimized` storage-WebP rule plus
 * the broken-image fallback live in `SafeImage`, which every tile renders
 * through. The mobile overflow regressions that plagued the old fixed-grid
 * tiles can't recur here: the column count is always responsive, never a fixed
 * 4-across grid.
 */
export function NaturalRatioGallery({
  images,
  columnsClassName = 'columns-2 gap-3 sm:columns-3',
  tileClassName = 'mb-3',
  eagerCount = 0,
  onTileClick,
  ariaLabel,
  overlay,
}: NaturalRatioGalleryProps) {
  const interactive = Boolean(onTileClick);

  const tile = (index: number) => (
    <>
      {/* SafeImage: unoptimized storage WebP + broken-image fallback. A broken
          photo has no intrinsic size, so the placeholder gets a min-height to
          keep the tile from collapsing to just the icon. */}
      <SafeImage
        src={images[index].src}
        alt={images[index].alt}
        width={0}
        height={0}
        loading={index < eagerCount ? 'eager' : 'lazy'}
        className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
        fallbackClassName="min-h-24"
      />
      {overlay?.(index)}
    </>
  );

  return (
    <div className={columnsClassName}>
      {images.map((image, i) =>
        interactive ? (
          <button
            key={image.src}
            type="button"
            onClick={() => onTileClick?.(i)}
            aria-label={ariaLabel?.(i)}
            className={cn(
              'group bg-muted focus-visible:ring-ring relative block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              tileClassName,
            )}
          >
            {tile(i)}
          </button>
        ) : (
          <div
            key={image.src}
            className={cn(
              'bg-muted break-inside-avoid overflow-hidden rounded-xl',
              tileClassName,
            )}
          >
            {tile(i)}
          </div>
        ),
      )}
    </div>
  );
}
