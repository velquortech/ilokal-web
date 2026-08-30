'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { EventWithRefs } from '@/lib/types';

interface MobileReviewCardListProps {
  table: Table<EventWithRefs>;
}

/**
 * The admin event-review queue as cards below `md`, from the SAME TanStack
 * rows as the desktop table.
 *
 * Nine columns — image, event, host, when, where, links, status, order,
 * actions — is the widest table in either dashboard, and the decision controls
 * are in the last one. On a 375px screen `<Table>`'s horizontal scroll means an
 * admin can read a proposal and never find the buttons that approve or reject
 * it.
 *
 * `links` is deliberately omitted here rather than stacked: the ticket and host
 * URLs are a desktop verification step, and reproducing them turns each card
 * into a wall. They stay one breakpoint away, in the row model, on the surface
 * where they are used.
 */
export function MobileReviewCardList({ table }: MobileReviewCardListProps) {
  const rows = table.getRowModel().rows;
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const render = (id: string) => {
          const found = cells.find((c) => c.column.id === id);
          if (!found) return null;
          return flexRender(found.column.columnDef.cell, found.getContext());
        };

        return (
          <div key={row.id} className="rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0">{render('image')}</div>
              <div className="min-w-0 flex-1">
                {render('name')}
                <div className="mt-1">{render('host')}</div>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              {render('when')}
              {render('address')}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {render('status')}
                {render('priority')}
              </div>
              {/* The decision controls, first-class rather than off-screen. */}
              <div className="shrink-0">{render('actions')}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
