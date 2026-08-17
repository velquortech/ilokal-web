'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { brandToneFor } from '@/lib/utils/brandTone';
import { SafeImage } from '@/components/custom/SafeImage';
import { eventPath, ROUTES } from '@/config/routeConfig';
import {
  compareForBanner,
  eventPhase,
  formatEventWhen,
} from '@/lib/utils/eventSchedule';
import type { EventWithRefs } from '@/lib/types';

/** Milliseconds a slide holds before advancing on its own. */
const AUTOPLAY_MS = 6000;

/**
 * The events banner: one full-width slide at a time, swipeable, with arrows
 * and dots.
 *
 * Built on scroll-snap rather than a transform track, so a touch swipe is the
 * browser's own gesture — no drag maths, no momentum to reimplement — and the
 * first slide still renders complete without JS.
 *
 * Order is chronological, with ONE exception: something happening right now
 * leads, ahead of what starts sooner. Someone opening this on a Saturday
 * afternoon wants what is on, not what is next.
 */
export function EventBanner({ events }: { events: EventWithRefs[] }) {
  const track = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);

  // Ranking depends on "now", which differs between the server render and the
  // client. Sorting during render is a hydration mismatch, so the server ships
  // the query's order and the live ranking applies after mount. Nothing is
  // hidden either way.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ordered = React.useMemo(() => {
    if (!now) return events;
    return [...events].sort((a, b) => compareForBanner(a, b, now));
  }, [events, now]);

  // Autoplay stops PERMANENTLY on the first interaction. A banner that keeps
  // moving after someone has taken control is fighting them.
  const [autoplay, setAutoplay] = React.useState(false);
  const stopAutoplay = React.useCallback(() => setAutoplay(false), []);

  React.useEffect(() => {
    if (events.length < 2) return;
    // Never seeded true on the server: `matchMedia` is client-only, and
    // starting an animation before the preference is known ignores it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setAutoplay(true);
  }, [events.length]);

  const goTo = React.useCallback((next: number, smooth = true) => {
    const node = track.current;
    if (!node) return;
    const count = node.children.length;
    if (count === 0) return;
    const target = ((next % count) + count) % count;
    node.scrollTo({
      left: node.clientWidth * target,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  React.useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      const node = track.current;
      // Paused while the tab is hidden — otherwise a backgrounded tab spends
      // the afternoon advancing and comes back on slide 400.
      if (!node || document.hidden || node.clientWidth === 0) return;
      const count = node.children.length;
      const current = Math.round(node.scrollLeft / node.clientWidth);
      goTo((current + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [autoplay, goTo]);

  // Derive the active dot from scroll position, so a swipe updates it too.
  const onScroll = React.useCallback(() => {
    const node = track.current;
    if (!node || node.clientWidth === 0) return;
    setIndex(Math.round(node.scrollLeft / node.clientWidth));
  }, []);

  // An empty carousel is worse than no carousel.
  if (events.length === 0) return null;

  const many = events.length > 1;
  const step = (delta: 1 | -1) => {
    stopAutoplay();
    goTo(index + delta);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What's on around Iloilo"
      className="relative"
      onPointerDown={stopAutoplay}
      onKeyDown={stopAutoplay}
    >
      <ul
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto rounded-2xl',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
          // The scrollbar is redundant beside arrows and dots, and it sits on
          // top of the artwork.
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {ordered.map((event, i) => (
          <Slide
            key={event.id}
            event={event}
            now={now}
            position={i + 1}
            total={ordered.length}
          />
        ))}
      </ul>

      {many && (
        <>
          <Arrow side="left" onClick={() => step(-1)} />
          <Arrow side="right" onClick={() => step(1)} />

          <div className="mt-3 flex items-center justify-center gap-2">
            {ordered.map((event, i) => (
              <button
                key={event.id}
                type="button"
                // A real button with a real label — a bare <span> dot is
                // invisible to the keyboard and to a screen reader.
                aria-label={`Go to ${event.name}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => {
                  stopAutoplay();
                  goTo(i);
                }}
                className={cn(
                  'focus-visible:ring-ring h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:outline-hidden',
                  i === index
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous event' : 'Next event'}
      className={cn(
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full sm:flex',
        'bg-background/80 hover:bg-background border shadow-sm backdrop-blur',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function Slide({
  event,
  now,
  position,
  total,
}: {
  event: EventWithRefs;
  /** Null until mount — see the note in EventBanner. */
  now: Date | null;
  position: number;
  total: number;
}) {
  const live = eventPhase(event, now ?? undefined) === 'live';

  return (
    <li
      // One slide per viewport of the track: `w-full shrink-0` is what makes
      // this a carousel rather than a strip.
      className="w-full shrink-0 snap-start"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
    >
      <Link
        href={eventPath(event.id)}
        className="group focus-visible:ring-ring relative block aspect-4/3 w-full overflow-hidden focus-visible:ring-2 focus-visible:outline-hidden sm:aspect-[21/9]"
      >
        {event.image_url ? (
          // SafeImage: unoptimized storage WebP + broken-image fallback (a
          // deleted photo shows the placeholder rather than the broken glyph).
          <SafeImage
            src={event.image_url}
            alt=""
            fill
            priority={position === 1}
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          // No photo: the id-derived brand tone, so a shop that is Jasmine in
          // the directory is Jasmine here too.
          <div
            className={cn('h-full w-full', brandToneFor(event.id))}
            aria-hidden
          />
        )}

        {/* Scrim. Overlaid copy on an arbitrary photo has no contrast
            guarantee without one — this is what keeps the text legible over a
            bright sky or a white wall. */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 space-y-1 p-5 text-white sm:p-8">
          {live && (
            <span className="bg-primary text-primary-foreground inline-block rounded-full px-2.5 py-1 text-xs font-medium">
              Happening now
            </span>
          )}

          <h3 className="font-display line-clamp-2 text-2xl leading-tight font-bold sm:text-4xl">
            {event.name}
          </h3>

          {/* Dates are Manila-local, always — the server is UTC and a visiting
              tourist could be anywhere. */}
          <p className="text-sm text-white/90 sm:text-base">
            {formatEventWhen(event)}
          </p>

          <p className="flex items-center gap-1 text-xs text-white/80 sm:text-sm">
            <MapPin className="size-3 shrink-0 sm:size-4" aria-hidden />
            <span className="line-clamp-1">{event.address}</span>
            {event.business && (
              <span className="line-clamp-1">
                {' '}
                · {event.business.shop_name}
              </span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

/** Heading + "all events" link, rendered above the carousel by the page. */
export function EventBannerHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-2xl font-semibold">What&rsquo;s on</h2>
        <p className="text-muted-foreground text-sm">
          Happening around Iloilo, soonest first.
        </p>
      </div>
      <Link
        href={ROUTES.EVENTS.HOME}
        className="text-primary text-sm hover:underline"
      >
        All events
      </Link>
    </div>
  );
}
