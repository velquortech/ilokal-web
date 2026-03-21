'use client';

import { Testimonial } from '@/components/custom/testimonial';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useState } from 'react';
import { testimonials, videos } from '../../data/data';

export function CustomerLoveSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
    setAutoplay(true); // autoplay when navigating
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
    setAutoplay(true); // autoplay when navigating
  };

  const handlePlayClick = () => {
    setAutoplay(true); // autoplay when user clicks play
  };

  const currentVideoSrc = autoplay
    ? `${videos[currentIndex].src}?autoplay=1`
    : videos[currentIndex].src;

  return (
    <div className="relative flex flex-row-reverse gap-12 py-10">
      <div className="z-10 space-y-4">
        <div className="inline-flex w-full items-center justify-between">
          <span className="font-medium">Customer Love</span>
          <Button size="sm">Check Reviews</Button>
        </div>

        <div className="mt-8 grid h-max gap-4">
          {testimonials.map((testimonial, key) => (
            <Testimonial {...testimonial} key={key} />
          ))}
        </div>
      </div>

      <div className="z-10 flex flex-1 items-center justify-center gap-4 rounded-md bg-black/10 dark:bg-black">
        <Button variant="outline" onClick={handlePrev}>
          <ChevronLeft />
        </Button>

        <div className="bg-muted-foreground relative aspect-9/16 w-md overflow-hidden">
          {!autoplay && (
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-4xl text-white"
              onClick={handlePlayClick}
            >
              <Play />
            </button>
          )}
          <iframe
            src={currentVideoSrc}
            title={videos[currentIndex].title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
            allowFullScreen
          />
        </div>

        <Button variant="outline" onClick={handleNext}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
