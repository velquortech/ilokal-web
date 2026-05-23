'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  PaginationState,
  ExpandedState,
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
import { DataTablePagination } from '@/components/custom/data-table/DataTablePagination';
import { createColumns } from './columns';
import type { Coupon, ProductResponse } from '@/lib/types';
import { Package } from 'lucide-react';

interface CouponsTableProps {
  coupons: Coupon[];
  products: ProductResponse[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

function ExpandedProducts({
  scopeValues,
  products,
}: {
  scopeValues: string[];
  products: ProductResponse[];
}) {
  const linked = products.filter((p) => scopeValues.includes(p.id));

  if (linked.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No matching products found.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {linked.map((product) => (
        <div
          key={product.id}
          className="bg-muted/50 border-border flex items-center gap-2.5 rounded-lg border px-3 py-2"
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="size-8 rounded-md object-cover"
            />
          ) : (
            <div className="bg-muted flex size-8 items-center justify-center rounded-md">
              <Package className="text-muted-foreground size-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{product.name}</span>
            <span className="text-muted-foreground text-xs">
              ₱{product.price.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CouponsTable({
  coupons,
  products,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: CouponsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const columns = React.useMemo(() => createColumns(products), [products]);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    onPaginationChange(next.pageIndex + 1, next.pageSize);
  };

  const table = useReactTable({
    data: coupons,
    columns,
    pageCount: totalPages,
    state: { pagination, sorting, expanded },
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => (row.original.scope_values?.length ?? 0) > 0,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-4">
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
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {row.getIsExpanded() && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={columns.length} className="px-6 py-3">
                        <div className="space-y-1.5">
                          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Linked Products
                          </p>
                          <ExpandedProducts
                            scopeValues={row.original.scope_values ?? []}
                            products={products}
                          />
                        </div>
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
                  No results.
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
