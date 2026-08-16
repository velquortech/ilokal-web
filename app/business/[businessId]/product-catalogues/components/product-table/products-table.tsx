'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { getColumns } from './columns';
import { MobileProductCardList } from './mobile-product-card-list';
import {
  SortingState,
  PaginationState,
  RowSelectionState,
  OnChangeFn,
} from '@tanstack/react-table';
import type {
  Category,
  ProductResponse,
  ProductSectionWithCount,
} from '@/lib/types';
import { BulkStatusActions } from './bulk-status-actions';

interface ProductTableProps {
  products: ProductResponse[];
  /** Passed through to the row actions so "Update" can offer a section. */
  sections?: ProductSectionWithCount[];
  /** Passed through so "Update" can offer a category (vertical-scoped). */
  categories?: Category[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  /** Rendered when the table is empty — see DataTable's `emptyState`. */
  emptyState?: React.ReactNode;
}

export function ProductTable({
  products,
  sections,
  categories,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
  emptyState,
}: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // New column identities on every render make TanStack rebuild the table; the
  // factory only depends on the sections and categories lists.
  const columns = React.useMemo(
    () => getColumns(sections, categories),
    [sections, categories],
  );

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  // Selection is keyed by product id, not row index — index keys are
  // meaningless once the server hands back a different page.
  //
  // It is also DROPPED whenever the rows change (page, filter, search, or a
  // refresh after a write). Keeping it would let ticks survive off-screen: the
  // bar can only act on what is on the page, so the user would see five boxes
  // ticked, be told "2 selected", and have all five cleared afterwards. What is
  // ticked is always exactly what will be acted on.
  const rowsKey = React.useMemo(
    () => products.map((p) => p.id).join(','),
    [products],
  );
  React.useEffect(() => {
    setRowSelection({});
  }, [rowsKey]);

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    onPaginationChange(next.pageIndex + 1, next.pageSize);
  };

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={products}
        pageCount={totalPages}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={setSorting}
        selection={{
          state: rowSelection,
          onChange: setRowSelection,
          getRowId: (row) => row.id,
        }}
        toolbar={
          <BulkStatusActions
            ids={selectedIds}
            onDone={() => setRowSelection({})}
          />
        }
        renderMobile={(table) => <MobileProductCardList table={table} />}
        emptyState={emptyState}
      />
    </div>
  );
}
