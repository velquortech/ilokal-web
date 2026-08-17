'use client';

import { useState } from 'react';
import { ImageLightbox } from '@/components/custom/ImageLightbox';
import { NaturalRatioGallery } from '@/components/custom/NaturalRatioGallery';

/**
 * "Inside the shop" — a 4-tile preview that opens the full set in the shared
 * lightbox.
 *
 * Not `Masonry`: that component hard-returns "Minimum 4 images required." and
 * imposes its own layout, and shops routinely have 1–3 interiors. Both use the
 * same `ImageLightbox`, so there's one dialog to maintain.
 *
 * Tiles are natural-ratio columns, not fixed squares: interior photos (often
 * wide) get cropped hard by an `aspect-square` frame, so each preview keeps
 * the photo's own shape — the columns auto-arrange 2-up at any count.
 */
export function InteriorGallery({
  images,
  shopName,
}: {
  images: string[];
  shopName: string;
}) {
  const [index, setIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const preview = images.slice(0, 4);
  // The preview caps at 4 in a narrow sidebar; the rest are reachable through
  // the overlay rather than silently dropped.
  const hiddenCount = images.length - preview.length;
  const showOverlay = (i: number) =>
    i === preview.length - 1 && hiddenCount > 0;

  const lightboxImages = images.map((src, i) => ({
    src,
    alt: `${shopName} interior ${i + 1}`,
  }));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Inside the shop</h2>

      <NaturalRatioGallery
        images={preview.map((src) => ({ src, alt: '' }))}
        columnsClassName="columns-2 gap-2"
        tileClassName="mb-2"
        // Opening the last tile jumps straight to the first hidden image — that
        // is what "+N more" promises.
        onTileClick={(i) => setIndex(showOverlay(i) ? preview.length : i)}
        ariaLabel={(i) =>
          showOverlay(i)
            ? `View all ${images.length} photos`
            : `Open photo ${i + 1} of ${images.length}`
        }
        overlay={(i) =>
          showOverlay(i) ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
              +{hiddenCount} more
            </span>
          ) : (
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
          )
        }
      />

      <ImageLightbox
        images={lightboxImages}
        index={index}
        onIndexChange={setIndex}
      />
    </section>
  );
}
