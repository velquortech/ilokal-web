'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { columns } from './columns';
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from '@tanstack/react-table';
import type { ProductResponse } from '@/lib/types';

interface ProductTableProps {
  products: ProductResponse[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export function ProductTable({
  products,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

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
