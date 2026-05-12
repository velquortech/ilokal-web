'use client';

import { Testimonial } from '@/components/custom/testimonial';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Video,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { BusinessShop } from '@/providers/BusinessProvider';
import { testimonials, videos } from '../../data/shop';
import { cn } from '@/lib/utils';

interface CustomerLoveSectionProps {
  business?: BusinessShop | null;
}

export function CustomerLoveSection({ business }: CustomerLoveSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  // Check if there is data to display
  const hasContent = false;
  const isRegistered = !!business?.shop_name;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
    setAutoplay(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
    setAutoplay(true);
  };

  const handlePlayClick = () => {
    setAutoplay(true);
  };

  const currentVideoSrc =
    autoplay && videos[currentIndex]
      ? `${videos[currentIndex].src}?autoplay=1`
      : videos[currentIndex]?.src;

  const sectionTitle = isRegistered
    ? `What ${business.shop_name} Customers Say`
    : 'Customer Love';

  return (
    <div
      className={cn(
        'relative flex gap-6 py-10',
        hasContent ? 'flex-row-reverse' : 'flex-col',
      )}
    >
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold tracking-tight">
          Testimonials & Reviews
        </h3>
        <p className="text-muted-foreground text-base">
          Manage your shop's testimonials and reviews
        </p>
      </div>
      {!hasContent ? (
        /* --- Empty State --- */
        <div className="border-muted-foreground/25 bg-muted/20 relative w-full overflow-hidden rounded-2xl border border-dashed p-12">
          {/* Decorative background icons */}
          <Heart className="text-primary/5 absolute -top-4 -right-4 h-24 w-24 -rotate-12" />

          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center space-y-6 text-center">
            <div className="flex -space-x-4">
              <div className="bg-background -rotate-6 rounded-2xl border p-4 shadow-sm">
                <Video className="text-primary/40 h-8 w-8" />
              </div>
              <div className="bg-background z-10 scale-110 rounded-2xl border p-4 shadow-lg">
                <Heart className="text-primary h-8 w-8 animate-pulse" />
              </div>
              <div className="bg-background rotate-6 rounded-2xl border p-4 shadow-sm">
                <MessageSquare className="text-primary/40 h-8 w-8" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">
                {sectionTitle}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isRegistered
                  ? "You don't have any featured testimonials or videos yet. Start collecting customer reviews to build trust with local tourists!"
                  : 'Complete your shop setup to begin showcasing customer testimonials and promotional videos.'}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant={isRegistered ? 'default' : 'secondary'}
                className="h-11 px-8 font-bold"
                disabled={!isRegistered}
              >
                {isRegistered ? 'Add Testimonial' : 'Awaiting Setup'}
              </Button>
              {isRegistered && (
                <Button variant="outline" className="h-11 px-8 font-bold">
                  Check Reviews
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* --- Content State --- */
        <>
          <div className="z-10 w-full space-y-4 lg:w-1/3">
            <div className="inline-flex w-full items-center justify-between">
              <span className="text-lg font-bold tracking-tight">
                {sectionTitle}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary font-bold"
              >
                Check Reviews
              </Button>
            </div>

            <div className="mt-8 grid h-max gap-4">
              {testimonials.map((testimonial, key) => (
                <Testimonial {...testimonial} key={key} />
              ))}
            </div>
          </div>

          <div className="bg-secondary/30 z-10 flex flex-1 items-center justify-center gap-4 rounded-2xl border p-8">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="relative aspect-9/16 w-full max-w-[320px] overflow-hidden rounded-xl bg-black shadow-2xl">
              {!autoplay && (
                <button
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 text-white transition-colors hover:bg-black/20"
                  onClick={handlePlayClick}
                >
                  <div className="bg-primary scale-100 rounded-full p-4 shadow-lg transition-transform hover:scale-110">
                    <Play className="ml-1 h-6 w-6 fill-current" />
                  </div>
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

            <Button
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
