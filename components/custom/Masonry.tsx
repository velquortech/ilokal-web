'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  // 👉 Navigation handlers
  const showPrev = () => {
    if (currentIndex === null) return;
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev! - 1));
  };

  const showNext = () => {
    if (currentIndex === null) return;
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev! + 1));
  };

  // 👉 Keyboard support
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

                if (!isReversed) {
                  if (i === 0) position = 'col-span-2 row-span-2';
                  if (i === 1) position = 'col-start-3 row-start-1';
                  if (i === 2) position = 'col-start-4 row-start-1';
                  if (i === 3) position = 'col-start-3 col-span-2 row-start-2';
                } else {
                  if (i === 0) position = 'col-start-1 col-span-2 row-start-2';
                  if (i === 1) position = 'col-start-1 row-start-1';
                  if (i === 2) position = 'col-start-2 row-start-1';
                  if (i === 3) position = 'col-start-3 col-span-2 row-span-2';
                }

                return (
                  <div
                    key={i}
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-xl',
                      position,
                    )}
                    onClick={() => setCurrentIndex(globalIndex)}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || ''}
                      fill
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
          className="min-w-5xl overflow-hidden border-none bg-black p-2"
          showCloseButton={false}
        >
          {currentIndex !== null && (
            <div className="relative flex min-h-[80vh] w-full items-center justify-center">
              {/* IMAGE */}
              <Image
                src={images[currentIndex].src}
                alt={images[currentIndex].alt || ''}
                fill
                className="object-contain"
              />

              {/* ⬅️ PREV */}
              <button
                onClick={showPrev}
                className="absolute left-4 rounded-full bg-white/20 p-2 transition hover:bg-white/40"
              >
                <ChevronLeft className="text-white" />
              </button>

              {/* ➡️ NEXT */}
              <button
                onClick={showNext}
                className="absolute right-4 rounded-full bg-white/20 p-2 transition hover:bg-white/40"
              >
                <ChevronRight className="text-white" />
              </button>

              {/* 📝 CAPTION */}
              {images[currentIndex].alt && (
                <p className="absolute bottom-4 rounded bg-black/50 px-3 py-1 text-sm text-white">
                  {images[currentIndex].alt}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
