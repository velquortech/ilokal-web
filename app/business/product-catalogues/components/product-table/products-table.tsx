'use client';

import * as React from 'react';
import { DataTable } from '@/components/custom/data-table/DataTable'; // Path to your reusable component
import { columns } from './columns';
import { SortingState, PaginationState } from '@tanstack/react-table';
import { products } from '@/app/business/data/products';

// TODO: pass filters to the component for server side filtering
export function ProductTable() {
  // data fetching should happen here...

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // 3. Mock Server Logic
  // In a real server-side scenario, you would fetch data here based on
  // sorting and pagination states.
  const pageCount = Math.ceil(products.length / pagination.pageSize);

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
