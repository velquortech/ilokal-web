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

  return (
    <div className="space-y-4">
      {toolbar}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
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
      <DataTablePagination table={table} />
    </div>
  );
}
