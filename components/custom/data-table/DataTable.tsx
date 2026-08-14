'use client';

import type { ReactNode } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  PaginationState,
  RowSelectionState,
  OnChangeFn,
  Table as TanStackTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './DataTablePagination';
import { cn } from '@/lib/utils';
import { responsiveColumnClass } from '@/lib/utils/tableMeta';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  pagination: PaginationState; // Matches { pageIndex: number; pageSize: number }
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  /**
   * Lift row selection out of the table. Optional — omit and TanStack keeps it
   * internally, which is what every table with no bulk action does.
   *
   * One object rather than three loose props: state without a handler freezes
   * the selection, and state without `getRowId` silently falls back to row
   * INDEX keys, which are meaningless across a server-side page change. Both
   * are unrepresentable this way.
   */
  selection?: {
    state: RowSelectionState;
    onChange: OnChangeFn<RowSelectionState>;
    getRowId: (row: TData, index: number) => string;
  };
  /** Rendered above the table — bulk actions for the current selection. */
  toolbar?: ReactNode;
  /**
   * What fills the table when `data` is empty. Defaults to "No results.".
   *
   * Optional because most tables have one empty case. Some have two, and this
   * repo has fixed outage-reading-as-empty on three separate surfaces: "we
   * couldn't load this" and "you haven't made one yet" are different things to
   * tell someone, and only the caller knows which happened.
   */
  emptyState?: ReactNode;
  /**
   * Layer 2 of the mobile strategy (§6.8): a card-list renderer for touch
   * screens.
   *
   * One TanStack instance, two renderers. When provided, the `<Table>` is
   * hidden below `md` and this renders instead, from the SAME
   * `table.getRowModel().rows` — so sorting, pagination, selection and
   * expansion stay single-source, and the caller reuses each column's `cell`
   * via `flexRender` instead of rebuilding row UI.
   */
  renderMobile?: (table: TanStackTable<TData>) => ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  selection,
  toolbar,
  emptyState,
  renderMobile,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      ...(selection && { rowSelection: selection.state }),
    },
    onPaginationChange,
    onSortingChange,
    ...(selection && {
      onRowSelectionChange: selection.onChange,
      getRowId: selection.getRowId,
    }),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Crucial for server-side
    manualSorting: true, // Crucial for server-side
    manualFiltering: true, // Crucial for server-side
  });

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className="space-y-4">
      {toolbar}
      <div
        className={cn(
          'rounded-md border',
          // With a card-view fallback the table is desktop-only; without one
          // it stays the single renderer on every size.
          renderMobile && hasRows && 'hidden md:block',
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    // A column whose `meta.responsiveClassName` hides it below
                    // a breakpoint hides its header too, so the two stay in
                    // step (see `lib/utils/tableMeta`).
                    className={cn(responsiveColumnClass(header.column))}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(responsiveColumnClass(cell.column))}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyState ?? 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {renderMobile && hasRows && (
        <div className="md:hidden">{renderMobile(table)}</div>
      )}
      <DataTablePagination table={table} />
    </div>
  );
}
