'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { Branch } from '@/lib/types';

interface MobileBranchCardListProps {
  table: Table<Branch>;
}

/**
 * The branches list as cards below `md`, from the SAME TanStack rows as the
 * desktop table.
 *
 * Six columns — name, address, coordinates, status, created, actions — and the
 * two that matter most on a phone are at opposite ends: the coordinates badge
 * (a branch with none is invisible to `nearby_businesses`, so it is the whole
 * point of this screen) and the edit/delete pair. `<Table>` scrolls sideways
 * rather than hiding anything, which means the fix is discoverable only by
 * someone who already knows to look.
 *
 * Cells are reused through `flexRender`, so the coordinate badge, the status
 * pill and the Manila-pinned date are the same components as the desktop row.
 */
export function MobileBranchCardList({ table }: MobileBranchCardListProps) {
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {render('name')}
                <div className="mt-1">{render('address')}</div>
              </div>
              {/* Edit/delete, first-class rather than off the right edge. */}
              <div className="shrink-0">{render('actions')}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {render('status')}
              {render('location')}
            </div>

            <div className="mt-2">{render('created_at')}</div>
          </div>
        );
      })}
    </div>
  );
}
