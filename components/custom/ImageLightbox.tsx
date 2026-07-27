'use client';

import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

export type LightboxImage = {
  src: string;
  alt?: string;
};

/**
 * Full-screen image viewer, extracted from `Masonry` so the explore gallery
 * and the shop gallery share one dialog instead of maintaining two.
 *
 * Controlled: the parent owns the index, which is what lets a grid open at the
 * tile that was clicked. `null` = closed.
 *
 * Arrow keys wrap; Escape closes (Radix also closes on Escape, but the handler
 * keeps behaviour identical when the dialog is embedded elsewhere). Radix
 * restores focus to the trigger on close.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const count = images.length;

  const showPrev = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      onIndexChange(
        index === null ? null : index === 0 ? count - 1 : index - 1,
      );
    },
    [count, index, onIndexChange],
  );

  const showNext = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      onIndexChange(
        index === null ? null : index === count - 1 ? 0 : index + 1,
      );
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    if (index === null) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPrev();
      else if (event.key === 'ArrowRight') showNext();
      else if (event.key === 'Escape') onIndexChange(null);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, onIndexChange, showNext, showPrev]);

  const current = index !== null ? images[index] : undefined;

  return (
    <Dialog
      open={index !== null && current !== undefined}
      onOpenChange={(open) => {
        if (!open) onIndexChange(null);
      }}
    >
      <DialogContent
        className="w-max overflow-hidden border-none bg-black/95 p-0 sm:max-w-max sm:rounded-2xl sm:p-0"
        showCloseButton={false}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Image gallery viewer</DialogTitle>
          <DialogDescription>
            {index !== null
              ? `Image ${index + 1} of ${count}`
              : 'Image gallery viewer'}
          </DialogDescription>
        </VisuallyHidden.Root>

        {current && (
          <div className="relative flex h-[85dvh] w-[min(90vw,56rem)] items-center justify-center">
            <Image
              src={current.src}
              alt={current.alt || 'Gallery preview'}
              fill
              priority
              sizes="(max-width: 1280px) 90vw, 1280px"
              className="object-contain p-4"
            />

            <button
              type="button"
              aria-label="Close gallery"
              onClick={(event) => {
                event.stopPropagation();
                onIndexChange(null);
              }}
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="size-3" />
            </button>

            {/* A single image has nowhere to page to. */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={showPrev}
                  className="absolute left-4 z-50 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                >
                  <ChevronLeft className="size-4 text-white" />
                </button>

                <button
                  type="button"
                  aria-label="Next image"
                  onClick={showNext}
                  className="absolute right-4 z-50 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
                >
                  <ChevronRight className="size-4 text-white" />
                </button>
              </>
            )}

            {current.alt && (
              <div className="absolute right-0 bottom-6 left-0 flex justify-center">
                <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                  {current.alt}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
