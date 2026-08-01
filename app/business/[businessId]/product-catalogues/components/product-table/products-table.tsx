'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { getColumns } from './columns';
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import type { ProductResponse, ProductSectionWithCount } from '@/lib/types';

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

  // New column identities on every render make TanStack rebuild the table; the
  // factory only depends on the sections list.
  const columns = React.useMemo(() => getColumns(sections), [sections]);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

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
      />
    </div>
  );
}
