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
  return (
    <div className="min-w-[12rem]">
      <div className="font-medium">{event.name}</div>
      {event.description && (
        <p className="text-muted-foreground line-clamp-1 text-xs">
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
    <div className="flex min-w-[11rem] flex-col gap-1">
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
      <span className="line-clamp-2">{address}</span>
    </p>
  );
}
