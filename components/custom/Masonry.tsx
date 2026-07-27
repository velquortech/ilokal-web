'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';
import { ImageLightbox } from '@/components/custom/ImageLightbox';

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

  const groups = [];
  for (let i = 0; i < images.length; i += 4) {
    groups.push(images.slice(i, i + 4));
  }

  // Navigation, keyboard handling and the dialog itself now live in
  // ImageLightbox — this component keeps only its masonry layout.
  return (
    <>
      {/* GRID */}
      <div className="flex flex-col gap-6">
        {groups.map((group, groupIndex) => {
          const isReversed = groupIndex % 2 === 1;

          return (
            <div
              key={groupIndex}
              className="grid auto-rows-[250px] grid-cols-2 gap-6 md:grid-cols-4"
            >
              {group.map((img, i) => {
                const globalIndex = groupIndex * 4 + i;
                let position = '';

                // Calculate size hint based on column spans
                let sizeHint = '(max-width: 768px) 50vw, 25vw';

                if (!isReversed) {
                  if (i === 0) {
                    position = 'col-span-2 row-span-2';
                    sizeHint = '(max-width: 768px) 100vw, 50vw';
                  }
                  if (i === 1) position = 'col-start-3 row-start-1';
                  if (i === 2) position = 'col-start-4 row-start-1';
                  if (i === 3) {
                    position = 'col-start-3 col-span-2 row-start-2';
                    sizeHint = '(max-width: 768px) 100vw, 50vw';
                  }
                } else {
                  if (i === 0) {
                    position = 'col-start-1 col-span-2 row-start-2';
                    sizeHint = '(max-width: 768px) 100vw, 50vw';
                  }
                  if (i === 1) position = 'col-start-1 row-start-1';
                  if (i === 2) position = 'col-start-2 row-start-1';
                  if (i === 3) {
                    position = 'col-start-3 col-span-2 row-span-2';
                    sizeHint = '(max-width: 768px) 100vw, 50vw';
                  }
                }

                return (
                  <div
                    key={i}
                    className={cn(
                      'group bg-muted border-border relative cursor-pointer overflow-hidden rounded-xl border',
                      position,
                    )}
                    onClick={() => setCurrentIndex(globalIndex)}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || 'Product gallery image'}
                      fill
                      loading={groupIndex === 0 ? 'eager' : 'lazy'}
                      sizes={sizeHint}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={images}
        index={currentIndex}
        onIndexChange={setCurrentIndex}
      />
    </>
  );
}
