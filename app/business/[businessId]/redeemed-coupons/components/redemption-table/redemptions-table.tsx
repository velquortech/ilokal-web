'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
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
import { redemptionColumns, formatDate } from './columns';
import type { RedemptionRecord } from '@/lib/types';

interface RedeemedCouponsTableProps {
  redemptions: RedemptionRecord[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

function ExpandedCouponDetail({ record }: { record: RedemptionRecord }) {
  const coupon = record.coupons;
  if (!coupon) return null;

  const scopeLabel = coupon.usage_scope.replace(/_/g, ' ');

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-4">
      {coupon.description && (
        <div className="col-span-2 sm:col-span-4">
          <span className="text-muted-foreground text-xs">Description</span>
          <p className="mt-0.5">{coupon.description}</p>
        </div>
      )}
      <div>
        <span className="text-muted-foreground text-xs">Usage Scope</span>
        <p className="mt-0.5 capitalize">{scopeLabel}</p>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">Coupon Expiry</span>
        <p className="mt-0.5">{formatDate(coupon.expiry_date)}</p>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">
          Redemption Expires
        </span>
        <p className="mt-0.5">{formatDate(record.expires_at)}</p>
      </div>
    </div>
  );
}

export function RedeemedCouponsTable({
  redemptions,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: RedeemedCouponsTableProps) {
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    onPaginationChange(next.pageIndex + 1, next.pageSize);
  };

  const table = useReactTable({
    data: redemptions,
    columns: redemptionColumns,
    pageCount: totalPages,
    state: { pagination, expanded },
    onPaginationChange: handlePaginationChange,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.coupons !== null,
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
                      <TableCell
                        colSpan={redemptionColumns.length}
                        className="px-6 py-3"
                      >
                        <div className="space-y-1.5">
                          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Coupon Details
                          </p>
                          <ExpandedCouponDetail record={row.original} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={redemptionColumns.length}
                  className="h-24 text-center"
                >
                  No redemptions found.
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
