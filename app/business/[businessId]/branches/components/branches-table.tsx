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
import { Button } from '@/components/ui/button';
import {
  Clock,
  MapPin,
  MapPinOff,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { BranchStatus } from '@/lib/types';
import { DataTablePagination } from '@/components/custom/data-table/DataTablePagination';
import { EditBranchDialog } from './edit-branch';
import { DeleteBranchDialog } from './delete-branch';
import type { Branch } from '@/lib/types';

interface BranchesTableProps {
  branches: Branch[];
  page: number;
  pageSize: number;
  totalPages: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onSuccess: () => void;
}

function BranchStatusBadge({ status }: { status: BranchStatus }) {
  if (status === 'pending_review') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-amber-700 dark:text-amber-400"
      >
        <Clock className="size-3" />
        Pending Review
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
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-green-700 dark:text-green-400"
    >
      Active
    </Badge>
  );
}

export function BranchesTable({
  branches,
  page,
  pageSize,
  totalPages,
  onPaginationChange,
  onSuccess,
}: BranchesTableProps) {
  const columns: ColumnDef<Branch>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Branch Name',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-64 truncate">
            {row.original.address ?? '—'}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Coordinates',
        cell: ({ row }) =>
          row.original.location ? (
            <Badge
              variant="secondary"
              className="gap-1 text-green-700 dark:text-green-400"
            >
              <MapPin className="size-3" />
              {row.original.location.coordinates[1].toFixed(4)},{' '}
              {row.original.location.coordinates[0].toFixed(4)}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <MapPinOff className="text-muted-foreground size-3" />
              No coordinates
            </Badge>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <BranchStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <EditBranchDialog branch={row.original} onSuccess={onSuccess}>
              <Button variant="ghost" size="icon" className="size-8">
                <Pencil className="size-4" />
                <span className="sr-only">Edit branch</span>
              </Button>
            </EditBranchDialog>
            <DeleteBranchDialog branch={row.original} onSuccess={onSuccess}>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Delete branch</span>
              </Button>
            </DeleteBranchDialog>
          </div>
        ),
      },
    ],
    [onSuccess],
  );

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  );

  const table = useReactTable({
    data: branches,
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

  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <MapPin className="text-muted-foreground mb-3 size-10" />
        <p className="text-muted-foreground text-sm">No branches found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add your first branch to appear on the map
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
