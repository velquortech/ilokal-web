'use client';

/**
 * Table cells shared by the owner's event list and the admin review queue.
 *
 * Both tables render the same event in the same columns; only the actions and
 * the host column differ. Keeping the cells here is what stops the two drifting
 * into two different ideas of what an event looks like.
 */

import * as React from 'react';
import Image from 'next/image';
import { ImageOff, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { eventPhase, formatEventWhen } from '@/lib/utils/eventSchedule';
import type { EventWithRefs } from '@/lib/types';

/**
 * The event's image, or a placeholder.
 *
 * `unoptimized` matches every other dashboard thumbnail: these are already
 * write-time WebP, and the free Supabase plan has no transform endpoint.
 * `onError` covers a path that resolved but no longer exists in the bucket.
 */
export function EventImageCell({ event }: { event: EventWithRefs }) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border">
      {event.image_url && !imgError ? (
        <Image
          src={event.image_url}
          alt=""
          fill
          unoptimized
          sizes="48px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="bg-muted flex h-full w-full items-center justify-center">
          <ImageOff className="text-muted-foreground size-5" aria-hidden />
        </div>
      )}
    </div>
  );
}

/** Name, with the description as the second line — the catalogue's shape. */
export function EventTitleCell({ event }: { event: EventWithRefs }) {
  // Bounded width, not just `min-w`. The table is auto-layout, so a cell's
  // MAX-content drives the column: an unclamped description wants its whole
  // length on one line, which stretched the Event column until the last three
  // columns fell off the right edge. `max-w` caps that; `truncate` /
  // `line-clamp-1` collapse the overflow into an ellipsis inside the cap.
  return (
    <div className="w-[10rem] max-w-[10rem] sm:w-[14rem] sm:max-w-[14rem] lg:w-[18rem] lg:max-w-[18rem]">
      <div className="truncate font-medium" title={event.name}>
        {event.name}
      </div>
      {event.description && (
        // `whitespace-normal` so the clamp gets a wrapping line to place its
        // ellipsis on — `TableCell` inherits `whitespace-nowrap`, which would
        // hard-clip the text with no ellipsis.
        <p className="text-muted-foreground line-clamp-1 text-xs whitespace-normal">
          {event.description}
        </p>
      )}
    </div>
  );
}

/**
 * When it is on.
 *
 * "Happening now" tests the daily window, not just the span — a three-day
 * fiesta open 10:00–22:00 is not running at 3am on day two. It only shows on an
 * approved event, because a pending proposal is not on anything.
 */
export function EventWhenCell({ event }: { event: EventWithRefs }) {
  const phase = eventPhase(event);

  return (
    // Capped so a multi-day range wraps to two lines instead of stretching the
    // column — same reason the title cell is bounded. `whitespace-normal`
    // overrides `TableCell`'s inherited `whitespace-nowrap`, which otherwise
    // keeps the range on one line and overflows it onto the next column.
    <div className="flex w-[8rem] max-w-[8rem] flex-col gap-1 whitespace-normal sm:w-[11rem] sm:max-w-[11rem]">
      <span className="text-sm">{formatEventWhen(event)}</span>
      {phase === 'live' && event.status === 'approved' && (
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/10 text-primary w-fit"
        >
          Happening now
        </Badge>
      )}
      {phase === 'past' && (
        <span className="text-muted-foreground text-xs">Finished</span>
      )}
    </div>
  );
}

/** The venue line. Truncated — an address is long and the row is not. */
export function EventVenueCell({ address }: { address: string }) {
  return (
    <p
      className="text-muted-foreground flex max-w-[14rem] items-start gap-1 text-xs"
      title={address}
    >
      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
      {/* `whitespace-normal` so the clamp can actually wrap to two lines —
          `TableCell` inherits `whitespace-nowrap`, which would keep it on one. */}
      <span className="line-clamp-2 whitespace-normal">{address}</span>
    </p>
  );
}
