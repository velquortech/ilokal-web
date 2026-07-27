'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageLightbox } from '@/components/custom/ImageLightbox';

/**
 * "Inside the shop" — a 4-tile preview that opens the full set in the shared
 * lightbox.
 *
 * Not `Masonry`: that component hard-returns "Minimum 4 images required." and
 * imposes its own layout, and shops routinely have 1–3 interiors. Both use the
 * same `ImageLightbox`, so there's one dialog to maintain.
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
  // The grid caps at 4 in a narrow sidebar; the rest are reachable through the
  // overlay rather than silently dropped.
  const hiddenCount = images.length - preview.length;

  const lightboxImages = images.map((src, i) => ({
    src,
    alt: `${shopName} interior ${i + 1}`,
  }));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Inside the shop</h2>

      <div className="grid grid-cols-2 gap-2">
        {preview.map((src, i) => {
          const isLastTile = i === preview.length - 1;
          const showOverlay = isLastTile && hiddenCount > 0;

          return (
            <button
              key={src}
              type="button"
              // Opening the last tile jumps straight to the first hidden image
              // — that is what "+N more" promises.
              onClick={() => setIndex(showOverlay ? preview.length : i)}
              aria-label={
                showOverlay
                  ? `View all ${images.length} photos`
                  : `Open photo ${i + 1} of ${images.length}`
              }
              className="group bg-muted focus-visible:ring-ring relative aspect-square cursor-pointer overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 200px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {showOverlay ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                  +{hiddenCount} more
                </span>
              ) : (
                <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
              )}
            </button>
          );
        })}
      </div>

      <ImageLightbox
        images={lightboxImages}
        index={index}
        onIndexChange={setIndex}
      />
    </section>
  );
}
