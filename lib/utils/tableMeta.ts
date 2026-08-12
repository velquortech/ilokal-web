import type { Column } from '@tanstack/react-table';

/**
 * Responsive column hiding, mobile-first.
 *
 * A column can declare `meta: { responsiveClassName: 'hidden sm:table-cell' }`
 * to drop itself off narrow screens while staying in the row model — the header
 * and every cell in that column carry the class, so the table degrades
 * gracefully instead of scrolling sideways through ten columns.
 *
 * `table-cell` (not `block`) in the breakpoint override: Tailwind's `hidden`
 * sets `display: none`, and the cell needs `display: table-cell` back once it
 * returns — an element inside `<table>` cannot be a block box.
 */
export function responsiveColumnClass<TData, TValue>(
  column: Column<TData, TValue>,
): string | undefined {
  const meta = column.columnDef.meta as
    | { responsiveClassName?: string }
    | undefined;
  return meta?.responsiveClassName;
}
