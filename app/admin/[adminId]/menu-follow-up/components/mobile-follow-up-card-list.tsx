'use client';

import { flexRender, type Table } from '@tanstack/react-table';

interface MobileFollowUpCardListProps<TData> {
  table: Table<TData>;
}

/**
 * The menu-follow-up list as cards below `md`, from the SAME TanStack rows as
 * the desktop table.
 *
 * Seven columns — shop, owner, missing, live deal, registered, last reminded,
 * actions — and the per-row "Send reminder" button is the last one, i.e. the
 * one a phone hides behind a horizontal scroll. "Last reminded" travels beside
 * it because that is the field an admin checks immediately before pressing it.
 *
 * Generic over the row type: this table's row shape is declared inline in its
 * content component, and importing it here would mean exporting a type that
 * exists for one call site.
 */
export function MobileFollowUpCardList<TData>({
  table,
}: MobileFollowUpCardListProps<TData>) {
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
                {render('shop_name')}
                <div className="mt-1">{render('owner')}</div>
              </div>
              <div className="shrink-0">{render('actions')}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {render('noun')}
              {render('deal')}
            </div>

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1">
                Registered {render('created')}
              </span>
              <span className="flex items-center gap-1">
                Reminded {render('reminded')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
