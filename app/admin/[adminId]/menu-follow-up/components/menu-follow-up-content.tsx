'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { SearchBar } from '@/components/custom/Searchbar';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { MobileFollowUpCardList } from './mobile-follow-up-card-list';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, MailCheck } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import type { MissingMenuBusiness } from '@/lib/api/admin/menuFollowUpQuery';
import { SendReminderButton } from './send-reminder-button';
import { SendAllButton } from './send-all-button';

interface Props {
  rows: MissingMenuBusiness[];
  /** True total across the filter (uncapped), for the "send to all" label. */
  total: number;
  failed: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  onlyNoPromo: boolean;
}

const columns: ColumnDef<MissingMenuBusiness>[] = [
  {
    accessorKey: 'shop_name',
    header: 'Shop',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.shop_name}</span>
    ),
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => (
      <div className="min-w-0">
        {row.original.owner_name && (
          <div className="truncate text-sm">{row.original.owner_name}</div>
        )}
        <div className="text-muted-foreground truncate text-xs">
          {row.original.owner_email || (
            <span className="text-destructive">no email</span>
          )}
        </div>
      </div>
    ),
  },
  {
    id: 'noun',
    header: 'Missing',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.offering_noun}</Badge>
    ),
  },
  {
    id: 'deal',
    header: 'Live deal',
    cell: ({ row }) =>
      row.original.has_live_promo ? (
        <span className="text-xs text-green-700 dark:text-green-400">Yes</span>
      ) : (
        <span className="text-muted-foreground text-xs">No</span>
      ),
  },
  {
    id: 'created',
    header: 'Registered',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.created_at
          ? formatDateShort(row.original.created_at)
          : '—'}
      </span>
    ),
  },
  {
    id: 'reminded',
    header: 'Last reminded',
    cell: ({ row }) =>
      row.original.menu_reminder_sent_at ? (
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <MailCheck className="size-3" />
          {formatDateShort(row.original.menu_reminder_sent_at)}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">Never</span>
      ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <SendReminderButton businessId={row.original.id} />
      </div>
    ),
  },
];

export function MenuFollowUpContent({
  rows,
  total,
  failed,
  page,
  pageSize,
  totalPages,
  search,
  onlyNoPromo,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const updateParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      });
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ search: value.trim() || null, page: '1' });
  }, 400);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="only-no-promo"
            checked={onlyNoPromo}
            onCheckedChange={(checked) =>
              updateParams({ onlyNoPromo: checked ? '1' : null, page: '1' })
            }
          />
          <Label htmlFor="only-no-promo" className="text-sm">
            Only shops with no live deal
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            defaultValue={searchParams.get('search') ?? ''}
            onSearch={handleSearch}
            placeholder="Search by shop name..."
            className="max-w-xs"
          />
          {/* Acts on the whole filter (server-derived), not just this page. */}
          <SendAllButton
            count={total}
            search={search}
            onlyNoPromo={onlyNoPromo}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pageCount={totalPages}
        pagination={{ pageIndex: page - 1, pageSize }}
        onPaginationChange={(updater) => {
          const nextState =
            typeof updater === 'function'
              ? updater({ pageIndex: page - 1, pageSize })
              : updater;
          updateParams({
            page:
              nextState.pageIndex === 0
                ? null
                : String(nextState.pageIndex + 1),
            perPage:
              nextState.pageSize === 10 ? null : String(nextState.pageSize),
          });
        }}
        sorting={sorting}
        onSortingChange={setSorting}
        renderMobile={(table) => <MobileFollowUpCardList table={table} />}
        emptyState={
          failed ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertTriangle className="text-muted-foreground size-8" />
              <p className="font-medium">We couldn&apos;t load this list</p>
              <p className="text-muted-foreground text-sm">
                Something went wrong on our side. Try again in a moment.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MailCheck className="text-muted-foreground size-8" />
              <p className="font-medium">Every verified shop has a menu</p>
              <p className="text-muted-foreground text-sm">
                No reminders to send right now.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}
