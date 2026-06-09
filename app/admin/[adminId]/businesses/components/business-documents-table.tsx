'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  PaginationState,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Clock, Ban, XCircle } from 'lucide-react';
import { DataTablePagination } from '@/components/custom/data-table/DataTablePagination';
import type {
  AdminBusinessWithMeta,
  BusinessVerificationStatus,
} from '@/lib/types/business';
import { BusinessActions } from './business-actions';

interface BusinessDocumentsTableProps {
  businesses: AdminBusinessWithMeta[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

/** The DB row exposes `shop_name`; the domain type lags as `name`. */
function shopNameOf(b: AdminBusinessWithMeta): string {
  return (
    (b as { shop_name?: string }).shop_name ?? b.name ?? 'Unnamed business'
  );
}

function VerificationStatusBadge({
  status,
}: {
  status: BusinessVerificationStatus;
}) {
  if (status === 'verified') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-green-700 dark:text-green-400"
      >
        <CheckCircle2 className="size-3" />
        Verified
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        Rejected
      </Badge>
    );
  }
  if (status === 'suspended') {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <Ban className="size-3" />
        Suspended
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-amber-700 dark:text-amber-400"
    >
      <Clock className="size-3" />
      Pending
    </Badge>
  );
}

export function BusinessDocumentsTable({
  businesses,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
}: BusinessDocumentsTableProps) {
  const columns: ColumnDef<AdminBusinessWithMeta>[] = React.useMemo(
    () => [
      {
        id: 'business',
        header: 'Business',
        cell: ({ row }) => (
          <span className="font-medium">{shopNameOf(row.original)}</span>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-56 truncate">
            {row.original.ownerName ??
              row.original.owner?.full_name ??
              row.original.owner?.email ??
              '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <VerificationStatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString()
              : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <BusinessActions
            businessId={row.original.id}
            businessName={shopNameOf(row.original)}
            status={row.original.status}
          />
        ),
      },
    ],
    [],
  );

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  );

  const table = useReactTable({
    data: businesses,
    columns,
    pageCount: totalPages,
    state: { pagination },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(next.pageIndex + 1, next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
  });

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <Building2 className="text-muted-foreground mb-3 size-10" />
        <p className="text-muted-foreground text-sm">No businesses found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Try adjusting the search or filter
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
