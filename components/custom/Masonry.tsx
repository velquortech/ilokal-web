'use client';

import { useState } from 'react';
import { ImageLightbox } from '@/components/custom/ImageLightbox';
import { NaturalRatioGallery } from '@/components/custom/NaturalRatioGallery';

type MasonryProps = {
  images: {
    src: string;
    alt?: string;
  }[];
};

export function Masonry({ images }: MasonryProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  if (images.length < 4) {
    return <p>Minimum 4 images required.</p>;
  }

  // Natural-ratio columns via the shared gallery: 2-up on a phone, 4-up from
  // `md`. Every photo keeps its own aspect — the old mosaic cropped each tile
  // into a fixed 200px/250px frame. Navigation and the dialog live in
  // ImageLightbox.
  return (
    <>
      <NaturalRatioGallery
        images={images.map((img) => ({
          src: img.src,
          alt: img.alt || 'Product gallery image',
        }))}
        columnsClassName="columns-2 gap-3 md:columns-4 md:gap-6"
        tileClassName="mb-3 border border-border md:mb-6"
        eagerCount={4}
        onTileClick={setCurrentIndex}
        overlay={() => (
          <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
        )}
      />

      <ImageLightbox
        images={images}
        index={currentIndex}
        onIndexChange={setCurrentIndex}
      />
    </>
  );
}
