'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { brandToneFor } from '@/lib/utils/brandTone';
import { eventPath, ROUTES } from '@/config/routeConfig';
import {
  compareForBanner,
  eventPhase,
  formatEventWhen,
} from '@/lib/utils/eventSchedule';
import type { EventWithRefs } from '@/lib/types';

/**
 * The dateline.
 *
 * Events are the only thing on iLokal with a DATE — shops, offerings and deals
 * are ambient. So this is not a carousel of interchangeable slides: it is a
 * strip along time. Order IS the information, and the gaps are real, so a
 * quiet fortnight looks quiet.
 *
 * One exception, and it is the whole point: something happening RIGHT NOW
 * jumps to the front, ahead of chronology. Someone opening this on a Saturday
 * afternoon wants what is on, not what is next.
 *
 * Deliberately NOT auto-advancing. A dateline is scrubbed, not waited on — and
 * a strip that moves on its own is fighting whoever is reading it. Arrows,
 * scroll-snap and the keyboard are the whole interaction.
 */
export function EventDateline({ events }: { events: EventWithRefs[] }) {
  const scroller = React.useRef<HTMLUListElement>(null);

  // Ranking depends on "now", which differs between the server render and the
  // client. Sorting during render would produce a hydration mismatch, so the
  // server order (starts_at, from the query) is what ships in the HTML and the
  // live ranking is applied after mount. Nothing is hidden either way.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    // One tick a minute is enough for "Happening now" to appear on time
    // without turning the page into an animation.
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ordered = React.useMemo(() => {
    if (!now) return events;
    return [...events].sort((a, b) => compareForBanner(a, b, now));
  }, [events, now]);

  // An empty carousel is worse than no carousel.
  if (events.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const node = scroller.current;
    if (!node) return;
    const panel = node.querySelector('li');
    const step = panel ? panel.clientWidth + 16 : node.clientWidth * 0.8;
    node.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="events-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="events-heading" className="text-2xl font-semibold">
            What&rsquo;s on
          </h2>
          <p className="text-muted-foreground text-sm">
            Happening around Iloilo, soonest first.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.EVENTS.HOME}
            className="text-primary text-sm hover:underline"
          >
            All events
          </Link>
          {/* Only worth showing when there is somewhere to scroll to. */}
          {events.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label="Previous events"
                onClick={() => scrollBy(-1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label="Next events"
                onClick={() => scrollBy(1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* The strip scrolls inside its own container, so the page body never
          scrolls sideways. `tabIndex` makes it keyboard-scrollable, which a
          plain overflow container is not in every browser. */}
      <ul
        ref={scroller}
        tabIndex={0}
        aria-label="Upcoming events"
        className={cn(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2',
          'focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-hidden',
          // Hide the native bar without losing the scrolling itself.
          '[scrollbar-width:thin]',
        )}
      >
        {ordered.map((event) => (
          <EventPanel key={event.id} event={event} now={now} />
        ))}
      </ul>
    </section>
  );
}

function EventPanel({
  event,
  now,
}: {
  event: EventWithRefs;
  /** Null until mount — see the note in EventDateline. */
  now: Date | null;
}) {
  const [imgError, setImgError] = React.useState(false);

  // Before mount this is computed against the server's clock, which is fine:
  // the badge is additive, so the worst case is that it appears a moment late.
  const phase = eventPhase(event, now ?? undefined);
  const live = phase === 'live';

  return (
    <li className="w-[85%] shrink-0 snap-start sm:w-[420px]">
      <Link
        href={eventPath(event.id)}
        className={cn(
          'group focus-visible:ring-ring block h-full overflow-hidden rounded-xl border',
          'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {event.image_url && !imgError ? (
            <Image
              src={event.image_url}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 85vw, 420px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
              onError={() => setImgError(true)}
            />
          ) : (
            // No photo yet: the id-derived brand tone, so a shop that is
            // Jasmine in the directory is Jasmine here too.
            <div
              className={cn(
                'flex h-full w-full items-center justify-center px-6 text-center',
                brandToneFor(event.id),
              )}
            >
              <span className="font-display text-xl leading-tight font-bold">
                {event.name}
              </span>
            </div>
          )}

          {live && (
            <span className="bg-primary text-primary-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium">
              Happening now
            </span>
          )}
        </div>

        <div className="space-y-1 p-4">
          <p className="line-clamp-1 font-medium">{event.name}</p>
          {/* Dates are Manila-local, always — the server is UTC and a visiting
              tourist could be anywhere. */}
          <p className="text-muted-foreground text-sm">
            {formatEventWhen(event)}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="line-clamp-1">{event.address}</span>
          </p>
          {event.business && (
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {event.business.shop_name}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
