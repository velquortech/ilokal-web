'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

type MasonryProps = {
  images: {
    src: string;
    alt?: string;
  }[];
  unoptimized?: boolean;
};

export function Masonry({ images, unoptimized }: MasonryProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  if (images.length < 4) {
    return <p>Minimum 4 images required.</p>;
  }

  const groups = [];
  for (let i = 0; i < images.length; i += 4) {
    groups.push(images.slice(i, i + 4));
  }

  const showPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev! - 1));
  };

  const showNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex === null) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev! + 1));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (currentIndex === null) return;
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'Escape') setCurrentIndex(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex]);

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
                      sizes={sizeHint}
                      unoptimized={unoptimized}
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

      {/* 🔍 MODAL */}
      <Dialog
        open={currentIndex !== null}
        onOpenChange={() => setCurrentIndex(null)}
      >
        <DialogContent
          className="w-max overflow-hidden border-none bg-black/95 p-0 sm:max-w-max sm:rounded-2xl"
          showCloseButton={false}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Image Gallery Viewer</DialogTitle>
            <DialogDescription>Image gallery viewer</DialogDescription>
          </VisuallyHidden.Root>

          {currentIndex !== null && (
            <div className="relative flex h-[85vh] w-4xl items-center justify-center">
              {/* IMAGE */}
              <Image
                src={images[currentIndex].src}
                alt={images[currentIndex].alt || 'Gallery Preview'}
                fill
                priority
                sizes="(max-width: 1280px) 90vw, 1280px"
                className="object-contain p-4"
                unoptimized={unoptimized}
              />

              {/* CONTROLS */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(null);
                }}
                className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="size-3" />
              </button>

              <button
                onClick={showPrev}
                className="absolute left-4 z-50 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
              >
                <ChevronLeft className="size-4 text-white" />
              </button>

              <button
                onClick={showNext}
                className="absolute right-4 z-50 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
              >
                <ChevronRight className="size-4 text-white" />
              </button>

              {/* CAPTION */}
              {images[currentIndex].alt && (
                <div className="absolute right-0 bottom-6 left-0 flex justify-center">
                  <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                    {images[currentIndex].alt}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
