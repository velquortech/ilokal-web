'use client';

import * as React from 'react';
import type {
  PaginationState,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
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
import { DataTable } from '@/components/custom/data-table/DataTable';
import { MobileBranchCardList } from './mobile-branch-card-list';
import { BUSINESS_TIME_ZONE } from '@/lib/utils/operatingHours';
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
        // Layer 1: secondary columns leave the table below the breakpoint
        // instead of pushing the actions off the right edge. They stay in the
        // row model, and the card list renders them.
        meta: { responsiveClassName: 'hidden lg:table-cell' },
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-64 truncate">
            {row.original.address ?? '—'}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Coordinates',
        meta: { responsiveClassName: 'hidden xl:table-cell' },
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
        meta: { responsiveClassName: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.created_at).toLocaleDateString(undefined, {
              timeZone: BUSINESS_TIME_ZONE,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <EditBranchDialog branch={row.original} onSuccess={onSuccess}>
              <Button variant="ghost" size="icon-touch">
                <Pencil className="size-4" />
                <span className="sr-only">Edit branch</span>
              </Button>
            </EditBranchDialog>
            <DeleteBranchDialog branch={row.original} onSuccess={onSuccess}>
              <Button
                variant="ghost"
                size="icon-touch"
                className="text-destructive hover:text-destructive"
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

  const handlePaginationChange = React.useCallback(
    (
      updater: PaginationState | ((old: PaginationState) => PaginationState),
    ) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(next.pageIndex + 1, next.pageSize);
    },
    [pagination, onPaginationChange],
  );

  /**
   * Branches are ordered by the server; this table does not sort. The shared
   * `DataTable` requires the pair anyway, and a frozen empty array with a
   * no-op says so honestly — a `useState` here would look like sorting that
   * simply does not work.
   */
  const sorting = React.useMemo<SortingState>(() => [], []);
  const noSorting = React.useCallback(() => {}, []);

  return (
    <DataTable
      columns={columns}
      data={branches}
      pageCount={totalPages}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      sorting={sorting}
      onSortingChange={noSorting}
      renderMobile={(table) => <MobileBranchCardList table={table} />}
      emptyState={
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
          <MapPin className="text-muted-foreground mb-2 size-8" />
          <p className="font-medium">No branches found</p>
          <p className="text-muted-foreground text-sm">
            Add your first branch to appear on the map.
          </p>
        </div>
      }
    />
  );
}
