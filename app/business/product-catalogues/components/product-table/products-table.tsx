'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { columns } from './columns';
import { SortingState, PaginationState } from '@tanstack/react-table';
import type { ProductResponse } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProductTableProps {
  products: ProductResponse[];
  isLoading: boolean;
}

export function ProductTable({ products, isLoading }: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const pageCount = Math.ceil(products.length / pagination.pageSize);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={products}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}
