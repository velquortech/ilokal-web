'use client';

import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { ExternalLink, Sparkles, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  EventImageCell,
  EventTitleCell,
  EventVenueCell,
  EventWhenCell,
} from '@/components/custom/events/EventCells';
import { EventStatusBadge } from '@/components/custom/events/EventStatusBadge';
import { explorePath } from '@/config/routeConfig';
import { safeExternalUrl } from '@/lib/utils/safeExternalUrl';
import type { EventWithRefs } from '@/lib/types';
import { PriorityCell } from './priority-cell';
import { ReviewActions } from './review-actions';

/** Who is behind this event: a shop, or iLokal itself. */
function HostCell({ event }: { event: EventWithRefs }) {
  if (!event.business) {
    // A platform event has no shop. Say so, rather than leaving an empty slot
    // that reads like missing data.
    return (
      <Badge
        variant="outline"
        className="border-primary/20 bg-primary/10 text-primary gap-1"
      >
        <Sparkles className="size-3" aria-hidden />
        iLokal
      </Badge>
    );
  }

  return (
    <div className="flex min-w-[9rem] flex-col gap-0.5">
      <Link
        href={explorePath(event.business.id)}
        className="flex items-center gap-1 text-sm hover:underline"
      >
        <Store className="size-3 shrink-0" aria-hidden />
        <span className="line-clamp-1">{event.business.shop_name}</span>
      </Link>
      {event.product && (
        <span className="text-muted-foreground text-xs">
          promotes {event.product.name}
        </span>
      )}
    </div>
  );
}

/**
 * The event's own links.
 *
 * Never rendered raw. Zod guards the write path, but rows written before that
 * check — and any direct PostgREST edit — bypass it entirely, so the render
 * side runs the same allowlist.
 */
function LinksCell({ event }: { event: EventWithRefs }) {
  const site = safeExternalUrl(event.link_url);
  const tickets = safeExternalUrl(event.ticket_url);

  if (!site && !tickets) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {site && (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
        >
          <ExternalLink className="size-3" aria-hidden />
          Website
        </a>
      )}
      {tickets && (
        <a
          href={tickets}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
        >
          <ExternalLink className="size-3" aria-hidden />
          Tickets
        </a>
      )}
    </div>
  );
}

export function getReviewColumns(): ColumnDef<EventWithRefs>[] {
  return [
    {
      id: 'image',
      header: 'Image',
      cell: ({ row }) => <EventImageCell event={row.original} />,
      // A thumbnail is the first thing a reviewer loses on a phone — the
      // title, schedule and status carry the review.
      meta: { responsiveClassName: 'hidden sm:table-cell' },
    },
    {
      accessorKey: 'name',
      header: 'Event',
      cell: ({ row }) => <EventTitleCell event={row.original} />,
    },
    {
      id: 'host',
      header: 'Host',
      cell: ({ row }) => <HostCell event={row.original} />,
      // The reviewer already sees the venue; who is behind it can wait until
      // there is room to breathe.
      meta: { responsiveClassName: 'hidden lg:table-cell' },
    },
    {
      id: 'when',
      header: 'When',
      cell: ({ row }) => <EventWhenCell event={row.original} />,
    },
    {
      accessorKey: 'address',
      header: 'Where',
      cell: ({ row }) => <EventVenueCell address={row.original.address} />,
      meta: { responsiveClassName: 'hidden md:table-cell' },
    },
    {
      id: 'links',
      header: 'Links',
      cell: ({ row }) => <LinksCell event={row.original} />,
      // Outbound links are the least-used column on a review row; keep the
      // phone screen for the decision itself.
      meta: { responsiveClassName: 'hidden lg:table-cell' },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <EventStatusBadge status={row.original.status} />
          {/* `whitespace-normal` overrides TableCell's inherited nowrap so the
              note wraps within its cap instead of overflowing the column. */}
          {row.original.review_note && (
            <p className="text-muted-foreground max-w-[12rem] text-xs whitespace-normal italic">
              “{row.original.review_note}”
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'priority',
      header: 'Order',
      cell: ({ row }) => <PriorityCell event={row.original} />,
      // Banner ordering is a desktop admin task; on a phone the field is an
      // accident waiting to happen.
      meta: { responsiveClassName: 'hidden md:table-cell' },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => <ReviewActions event={row.original} />,
    },
  ];
}
