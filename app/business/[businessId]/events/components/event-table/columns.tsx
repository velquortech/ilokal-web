'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  EventImageCell,
  EventTitleCell,
  EventVenueCell,
  EventWhenCell,
} from '@/components/custom/events/EventCells';
import { EventStatusBadge } from '@/components/custom/events/EventStatusBadge';
import type { EventWithRefs } from '@/lib/types';
import { EventActions } from './event-actions';
import type { OfferingOption } from '../event-dialog';

/**
 * A factory, not a constant: the row actions need the shop id (to prove
 * ownership on every write) and the offering list (so "Edit" can offer the
 * promotes picker), and TanStack has no other channel for passing them into a
 * cell.
 */
export function getColumns(
  businessId: string,
  offerings: OfferingOption[],
): ColumnDef<EventWithRefs>[] {
  return [
    {
      id: 'image',
      header: 'Image',
      cell: ({ row }) => <EventImageCell event={row.original} />,
    },
    {
      accessorKey: 'name',
      header: 'Event',
      cell: ({ row }) => <EventTitleCell event={row.original} />,
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
    },
    {
      id: 'promotes',
      header: 'Promotes',
      cell: ({ row }) =>
        row.original.product ? (
          <Badge variant="secondary">{row.original.product.name}</Badge>
        ) : (
          // Not "—": the shop itself is a real answer, and the picker says so.
          <span className="text-muted-foreground text-xs">The shop</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <EventStatusBadge status={row.original.status} />
          {/* The reason belongs on the row, not only in the bell — an owner
              should not have to find a notification to learn what to change. */}
          {/* `whitespace-normal` overrides TableCell's inherited nowrap so the
              note wraps within its cap instead of overflowing the column. */}
          {row.original.status === 'rejected' && row.original.review_note && (
            <p className="text-destructive max-w-[14rem] text-xs whitespace-normal">
              “{row.original.review_note}”
            </p>
          )}
          {row.original.status === 'approved' && (
            <p className="text-muted-foreground max-w-[14rem] text-xs whitespace-normal">
              Editing sends it back for review.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <EventActions
          businessId={businessId}
          event={row.original}
          offerings={offerings}
        />
      ),
    },
  ];
}
