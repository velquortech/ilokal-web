'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  PaginationState,
  RowSelectionState,
  ExpandedState,
  VisibilityState,
  OnChangeFn,
  Row as TanStackRow,
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
  /**
   * Rendered above the table — bulk actions, a column-visibility menu, a count.
   *
   * Accepts a render function as well as a node, because some toolbars need the
   * table instance (column visibility is the case that forced it) and the
   * instance is created in here. A plain node stays valid, so no existing
   * caller changed.
   */
  toolbar?: ReactNode | ((table: TanStackTable<TData>) => ReactNode);
  /**
   * Lift column visibility out of the table, for a toolbar that toggles it.
   * Omit and TanStack keeps it internally — which is what every table with no
   * visibility menu does.
   */
  columnVisibility?: {
    state: VisibilityState;
    onChange: OnChangeFn<VisibilityState>;
  };
  /**
   * Sorting is SERVER-side by default, because every table here is
   * server-paged: sorting the ten rows the server happened to return is not
   * sorting the data, and looks identical to a user.
   *
   * Set false only where the caller genuinely sorts the page it was given and
   * says so — the admin users table has always worked that way, and changing
   * that behaviour is a separate decision from removing its fork.
   */
  manualSorting?: boolean;
  /**
   * Whether the pager offers a rows-per-page control.
   *
   * Turn it OFF where the page size is fixed by the data source. A selector
   * that cannot change what is fetched is the exact "Rows per page does
   * nothing" defect the 2026-07-25 pass had to fix on the product catalogue —
   * an inert control is worse than no control, because it reads as broken.
   */
  pageSizeSelect?: boolean;
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
   * Expandable rows. Optional — omit and the table has no expansion.
   *
   * Expansion state lives in the composite (lifted like sorting); the row's
   * `expand` column calls `row.getToggleExpandedHandler()` as usual, and when
   * a row is expanded a full-width row renders `renderExpanded` below it —
   * the same pattern the coupons/redemptions tables hand-rolled before this.
   */
  expandable?: {
    getRowCanExpand: (row: TanStackRow<TData>) => boolean;
    renderExpanded: (row: TanStackRow<TData>) => ReactNode;
  };
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
  columnVisibility,
  manualSorting = true,
  pageSizeSelect = true,
  emptyState,
  expandable,
  renderMobile,
}: DataTableProps<TData, TValue>) {
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
      ...(expandable && { expanded }),
      ...(selection && { rowSelection: selection.state }),
      ...(columnVisibility && { columnVisibility: columnVisibility.state }),
    },
    onPaginationChange,
    onSortingChange,
    ...(expandable && {
      onExpandedChange: setExpanded,
      getRowCanExpand: expandable.getRowCanExpand,
    }),
    ...(selection && {
      onRowSelectionChange: selection.onChange,
      getRowId: selection.getRowId,
    }),
    ...(columnVisibility && {
      onColumnVisibilityChange: columnVisibility.onChange,
    }),
    getCoreRowModel: getCoreRowModel(),
    ...(expandable && { getExpandedRowModel: getExpandedRowModel() }),
    // Only when the caller opted into sorting the page it holds. Adding this
    // unconditionally would silently re-sort server-ordered rows.
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    manualPagination: true, // Crucial for server-side
    manualSorting, // Server-side by default; see the prop.
    manualFiltering: true, // Crucial for server-side
  });

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className="space-y-4">
      {typeof toolbar === 'function' ? toolbar(table) : toolbar}
      <div
        className={cn(
          'rounded-md border',
          // With a card-view fallback the table is desktop-only — also when it
          // is EMPTY: the empty state then renders in the mobile slot below, so
          // a phone never sees a full header row it has to scroll sideways
          // past just to reach "No results".
          renderMobile && 'hidden md:block',
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
                <React.Fragment key={row.id}>
                  <TableRow
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
                  {expandable && row.getIsExpanded() && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={columns.length} className="px-6 py-3">
                        {expandable.renderExpanded(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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
      {renderMobile && (
        <div className="md:hidden">
          {hasRows ? (
            renderMobile(table)
          ) : (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
              {emptyState ?? 'No results.'}
            </div>
          )}
        </div>
      )}
      <DataTablePagination table={table} showPageSize={pageSizeSelect} />
    </div>
  );
}
