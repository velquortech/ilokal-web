'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { getColumns } from './columns';
import {
  SortingState,
  PaginationState,
  RowSelectionState,
  OnChangeFn,
} from '@tanstack/react-table';
import type { ProductResponse, ProductSectionWithCount } from '@/lib/types';
import { BulkStatusActions } from './bulk-status-actions';

interface ProductTableProps {
  products: ProductResponse[];
  /** Passed through to the row actions so "Update" can offer a section. */
  sections?: ProductSectionWithCount[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export function ProductTable({
  products,
  sections,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // New column identities on every render make TanStack rebuild the table; the
  // factory only depends on the sections list.
  const columns = React.useMemo(() => getColumns(sections), [sections]);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  // Keying selection by product id (not row index) is what makes the ids below
  // real ids — and stops a page change from carrying a selection over to
  // whatever now sits at those positions.
  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  // The page's rows come from the server, so a stale id can survive a refresh
  // (deleted elsewhere, filtered out). Only act on what is actually on screen.
  const visibleSelectedIds = React.useMemo(() => {
    const onPage = new Set(products.map((p) => p.id));
    return selectedIds.filter((id) => onPage.has(id));
  }, [selectedIds, products]);

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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        toolbar={
          <BulkStatusActions
            ids={visibleSelectedIds}
            onDone={() => setRowSelection({})}
          />
        }
      />
    </div>
  );
}
