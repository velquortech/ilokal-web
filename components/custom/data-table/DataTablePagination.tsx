import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  /**
   * Whether to offer a rows-per-page control. Default true.
   *
   * Off where the page size is fixed by the data source: a selector that
   * cannot change what is fetched is the "Rows per page does nothing" defect
   * the 2026-07-25 pass had to fix, and an inert control reads as a broken one.
   */
  showPageSize?: boolean;
}

export function DataTablePagination<TData>({
  table,
  showPageSize = true,
}: DataTablePaginationProps<TData>) {
  /**
   * Only tables that actually render a checkbox column can have a selection.
   * Printing "0 of 10 row(s) selected" under a table with nothing selectable
   * describes a control that isn't there, and reads as a broken one. The empty
   * `<div>` keeps `justify-between` pushing the pager right.
   */
  const hasSelectionColumn = table
    .getAllColumns()
    .some((column) => column.id === 'select');

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2">
      {hasSelectionColumn ? (
        <div className="text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      ) : (
        <div />
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:gap-x-8">
        {showPageSize && (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-11 w-17.5 md:h-8">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex w-25 items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-11 w-11 p-0 md:h-8 md:w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
