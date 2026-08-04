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
import { getReviewColumns } from './columns';

interface EventsReviewTableProps {
  events: EventWithRefs[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  loadFailed: boolean;
  /** Drives the empty copy — an empty queue is good news, an empty list isn't. */
  awaitingDecisionsOnly: boolean;
}

/**
 * No selection column, deliberately. Bulk-approving is precisely what the
 * approval gate exists to prevent: every proposal is a decision about what
 * appears on the platform's front door, and each one gets a look.
 */
export function EventsReviewTable({
  events,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
  loadFailed,
  awaitingDecisionsOnly,
}: EventsReviewTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const columns = React.useMemo(() => getReviewColumns(), []);

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
              loadFailed
                ? "We couldn't load the queue"
                : awaitingDecisionsOnly
                  ? 'Nothing waiting'
                  : 'Nothing here'
            }
            body={
              loadFailed
                ? 'Something went wrong on our side. Try again in a moment.'
                : awaitingDecisionsOnly
                  ? 'Every proposal has been decided.'
                  : 'No events match this filter.'
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
