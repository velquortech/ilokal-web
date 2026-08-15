'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import type { EventWithRefs } from '@/lib/types';

interface MobileEventCardListProps {
  table: Table<EventWithRefs>;
}

/**
 * Layer 2 of the mobile strategy (§6.8): the owner's event list as cards
 * below `md`, from the SAME TanStack rows as the desktop table.
 *
 * Each card reuses the column cells via `flexRender` — the image, the
 * name+description block, the when line (with its "Happening now"/"Finished"
 * states), the status pill and the promotes badge all come straight from the
 * table columns, and the kebab footer is the existing `EventActions`. Sorting
 * and pagination stay single-source; a row never renders differently from its
 * cells.
 */
export function MobileEventCardList({ table }: MobileEventCardListProps) {
  const rows = table.getRowModel().rows;
  if (!rows.length) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const cell = (id: string) => cells.find((c) => c.column.id === id);

        return (
          <div
            key={row.id}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className="rounded-lg border p-3"
          >
            <div className="flex items-start gap-3">
              {cell('image') &&
                flexRender(
                  cell('image')!.column.columnDef.cell,
                  cell('image')!.getContext(),
                )}
              <div className="min-w-0 flex-1">
                {cell('name') &&
                  flexRender(
                    cell('name')!.column.columnDef.cell,
                    cell('name')!.getContext(),
                  )}
              </div>
            </div>

            <div className="mt-2">
              {cell('when') &&
                flexRender(
                  cell('when')!.column.columnDef.cell,
                  cell('when')!.getContext(),
                )}
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {cell('status') &&
                  flexRender(
                    cell('status')!.column.columnDef.cell,
                    cell('status')!.getContext(),
                  )}
              </div>
              <div className="shrink-0 text-right">
                {cell('promotes') &&
                  flexRender(
                    cell('promotes')!.column.columnDef.cell,
                    cell('promotes')!.getContext(),
                  )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-end border-t pt-2">
              {cell('actions') &&
                flexRender(
                  cell('actions')!.column.columnDef.cell,
                  cell('actions')!.getContext(),
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
