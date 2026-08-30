'use client';

import * as React from 'react';
import type {
  PaginationState,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Clock, Ban, XCircle } from 'lucide-react';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { MobileBusinessCardList } from './mobile-business-card-list';
import { BUSINESS_TIME_ZONE } from '@/lib/utils/operatingHours';
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
        // Layer 1 of the mobile strategy: secondary columns leave the table
        // below the breakpoint rather than pushing the actions kebab off the
        // right edge. They are still in the row model, and the card list
        // renders them.
        meta: { responsiveClassName: 'hidden lg:table-cell' },
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
        meta: { responsiveClassName: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString(
                  // Pinned: the server renders this table in UTC, so without
                  // an explicit zone a Manila submission reads as the day
                  // before.
                  undefined,
                  { timeZone: BUSINESS_TIME_ZONE },
                )
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
   * This table does not sort — the server orders by submission date. The
   * shared `DataTable` still requires the pair, and passing a frozen empty
   * array with a no-op is the honest way to say so: a `useState` here would
   * look like sorting that simply does not work.
   */
  const sorting = React.useMemo<SortingState>(() => [], []);
  const noSorting = React.useCallback(() => {}, []);

  return (
    <DataTable
      columns={columns}
      data={businesses}
      pageCount={totalPages}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      sorting={sorting}
      onSortingChange={noSorting}
      renderMobile={(table) => <MobileBusinessCardList table={table} />}
      emptyState={
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
          <Building2 className="text-muted-foreground mb-2 size-8" />
          <p className="font-medium">No businesses found</p>
          <p className="text-muted-foreground text-sm">
            Try adjusting the search or filter.
          </p>
        </div>
      }
    />
  );
}
