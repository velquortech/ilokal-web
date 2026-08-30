'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { AdminBusinessWithMeta } from '@/lib/types/business';

interface MobileBusinessCardListProps {
  table: Table<AdminBusinessWithMeta>;
}

/**
 * The admin document-review list as cards below `md`, from the SAME TanStack
 * rows as the desktop table.
 *
 * Five columns — business, owner, status, submitted, actions — do not fit a
 * 375px screen, and `<Table>`'s `overflow-x-auto` turns that into a
 * scroll-within-scroll most people never discover: the kebab that approves or
 * rejects a shop is in the last column, i.e. the one off-screen.
 *
 * Every cell is reused through `flexRender` rather than rebuilt, so a row can
 * never render differently from its own columns — the status badge, the
 * Manila-pinned date and the actions menu are the same components either way.
 */
export function MobileBusinessCardList({ table }: MobileBusinessCardListProps) {
  const rows = table.getRowModel().rows;
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const cell = (id: string) => cells.find((c) => c.column.id === id);
        const render = (id: string) => {
          const found = cell(id);
          if (!found) return null;
          return flexRender(found.column.columnDef.cell, found.getContext());
        };

        return (
          <div key={row.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {render('business')}
                <div className="mt-1">{render('owner')}</div>
              </div>
              {/* The kebab, first-class rather than off the right edge. */}
              <div className="shrink-0">{render('actions')}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              {render('status')}
              <span className="text-muted-foreground text-xs">
                Submitted {render('created_at')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
