'use client';

import { flexRender, type Table } from '@tanstack/react-table';

interface MobileCategoryCardListProps<TData> {
  table: Table<TData>;
}

/**
 * The offering-taxonomy list as cards below `md`, from the SAME TanStack rows
 * as the desktop table.
 *
 * Six columns — name, slug, kind, business type, created, actions — with the
 * edit/delete kebab last. Slug and kind travel together under the name because
 * they are what an admin checks before editing: the slug is what the mobile
 * filter and every URL depend on, and kind is what decides whether the category
 * ever appears in a shop's picker at all.
 *
 * Generic over the row type: the row shape is declared inline in the content
 * component, and exporting a type for one call site would be worse than a
 * parameter.
 */
export function MobileCategoryCardList<TData>({
  table,
}: MobileCategoryCardListProps<TData>) {
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
                <div className="text-muted-foreground mt-1 text-xs">
                  {render('slug')}
                </div>
              </div>
              <div className="shrink-0">{render('actions')}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {render('kind')}
              {render('business_type_id')}
            </div>

            <div className="text-muted-foreground mt-2 text-xs">
              {render('created_at')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
