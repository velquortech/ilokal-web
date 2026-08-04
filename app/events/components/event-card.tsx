import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { brandToneFor } from '@/lib/utils/brandTone';
import { eventPath } from '@/config/routeConfig';
import { eventPhase, formatEventWhen } from '@/lib/utils/eventSchedule';
import type { EventWithRefs } from '@/lib/types';

/**
 * One event in the grid.
 *
 * No state and no handlers of its own — but it does NOT stay off the client
 * bundle: `events-browser.tsx` is a client component and imports this, so the
 * whole card ships and both badges are re-evaluated at hydration.
 *
 * `eventPhase` therefore runs against the SERVER clock on the first render and
 * the DEVICE clock on the second. For an event measured in hours those agree,
 * but at a phase boundary (or with a skewed device clock) they will not, and
 * React will warn. Passing a server-computed phase down as a prop is the fix;
 * it is not done here yet.
 */
export function EventCard({ event }: { event: EventWithRefs }) {
  const live = eventPhase(event) === 'live';
  const past = eventPhase(event) === 'past';

  return (
    <li>
      <Link
        href={eventPath(event.id)}
        className={cn(
          'group focus-visible:ring-ring block h-full overflow-hidden rounded-xl border',
          'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              className={cn(
                'object-cover transition-transform duration-300',
                'group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none',
                // A finished event is still worth reading, but it should not
                // compete with what is still to come.
                past && 'opacity-70',
              )}
            />
          ) : (
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
          {past && (
            <span className="bg-muted text-muted-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium">
              Finished
            </span>
          )}
        </div>

        <div className="space-y-1 p-4">
          <p className="line-clamp-2 font-medium">{event.name}</p>
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
