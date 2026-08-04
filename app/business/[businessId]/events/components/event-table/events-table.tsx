'use client';

import * as React from 'react';
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import { CalendarDays } from 'lucide-react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import type { EventWithRefs } from '@/lib/types';
import { getColumns } from './columns';
import type { OfferingOption } from '../event-dialog';

interface EventsTableProps {
  businessId: string;
  events: EventWithRefs[];
  offerings: OfferingOption[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  /** The read failed — a different thing to say than "you have none". */
  loadFailed: boolean;
}

/**
 * No selection column, deliberately.
 *
 * Every state an owner can move an event into is a per-event decision, and the
 * only bulk action worth having would be "remove these", which is destructive
 * and irreversible from the UI. The catalogue earns its checkboxes; this does
 * not.
 */
export function EventsTable({
  businessId,
  events,
  offerings,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
  loadFailed,
}: EventsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // New column identities on every render make TanStack rebuild the table.
  const columns = React.useMemo(
    () => getColumns(businessId, offerings),
    [businessId, offerings],
  );

  const pagination: PaginationState = { pageIndex: page - 1, pageSize };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    onPaginationChange(next.pageIndex + 1, next.pageSize);
  };

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={events}
        pageCount={totalPages}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={setSorting}
        emptyState={
          <EmptyState
            title={
              loadFailed ? "We couldn't load your events" : 'No events yet'
            }
            body={
              loadFailed
                ? 'Something went wrong on our side. Try again in a moment.'
                : 'Propose one and the iLokal team will review it before it appears on Explore.'
            }
          />
        }
      />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <CalendarDays className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}
