'use client';

import { flexRender, type Table } from '@tanstack/react-table';

interface MobileFieldCardListProps<TData> {
  table: Table<TData>;
  /**
   * Column ids rendered as the card's heading block, in order, without their
   * header label. Usually the name and whatever identifies the row.
   */
  primaryColumnIds?: string[];
  /**
   * Column ids pinned to the top-right of the card — the row's actions.
   * Pulled out of the label/value list because a kebab under a "Actions:"
   * label reads as data.
   */
  actionColumnIds?: string[];
}

/**
 * A generic card list for `DataTable`'s `renderMobile`, from the SAME TanStack
 * rows as the desktop table.
 *
 * The bespoke card lists (events, coupons, branches, business review…) lay out
 * their columns deliberately, because they know what each one means. This one
 * is for tables whose columns are supplied by the CALLER and differ per mount
 * — the admin users table is six different column sets across six tabs — where
 * a hand-laid card would have to guess.
 *
 * So every remaining visible column renders as a label/value pair, with the
 * label taken from the column's own `header`. That is plainer than a bespoke
 * card and strictly better than a nine-column horizontal scroll whose actions
 * are off the right edge.
 *
 * Cells come through `flexRender`, so a card can never render differently from
 * its own column.
 */
/**
 * The label for a field row.
 *
 * A column header is often a RENDER FUNCTION rather than a string — a sort
 * button, or an `sr-only` span on the actions column. Those cannot be
 * `flexRender`ed here: they want a HeaderContext and all this has is a cell's,
 * and a sort button makes no sense as a `<dt>` on a card anyway. So a
 * non-string header falls back to the column id, humanised — `created_at`
 * reads as "Created at", which is the information the label was carrying.
 */
function labelFor(header: unknown, columnId: string): string {
  if (typeof header === 'string' && header.trim()) return header;
  const words = columnId.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function MobileFieldCardList<TData>({
  table,
  primaryColumnIds = [],
  actionColumnIds = ['actions'],
}: MobileFieldCardListProps<TData>) {
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

        const rest = cells.filter(
          (c) =>
            !primaryColumnIds.includes(c.column.id) &&
            !actionColumnIds.includes(c.column.id),
        );

        return (
          <div key={row.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                {primaryColumnIds.map((id) => (
                  <div key={id}>{render(id)}</div>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {actionColumnIds.map((id) => (
                  <div key={id}>{render(id)}</div>
                ))}
              </div>
            </div>

            <dl className="mt-3 space-y-1.5">
              {rest.map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-start justify-between gap-3"
                >
                  <dt className="text-muted-foreground shrink-0 text-xs">
                    {labelFor(cell.column.columnDef.header, cell.column.id)}
                  </dt>
                  <dd className="min-w-0 text-right text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
