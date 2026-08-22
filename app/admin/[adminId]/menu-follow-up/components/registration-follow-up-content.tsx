'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { SearchBar } from '@/components/custom/Searchbar';
import { DataTable } from '@/components/custom/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, MailCheck, PartyPopper } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import type { OwnerMissingBusiness } from '@/lib/api/admin/registrationFollowUpQuery';
import { SendRegistrationReminderButton } from './send-registration-reminder-button';
import { SendRegistrationAllButton } from './send-registration-all-button';

interface Props {
  rows: OwnerMissingBusiness[];
  /** True total across the filter (uncapped), for the "send to all" label. */
  total: number;
  failed: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  onlyStarted: boolean;
  /** How many steps the wizard currently has, so "4 of 6" tracks the flag. */
  totalSteps: number;
}

/**
 * The URL keys are PREFIXED (`rSearch`, `rPage`, `rPerPage`) because this table
 * shares a page with the menu follow-up one. Unprefixed keys would mean paging
 * one tab silently paged the other, and a single `search` box filtering both.
 */
const PARAM = {
  search: 'rSearch',
  page: 'rPage',
  perPage: 'rPerPage',
  onlyStarted: 'onlyStarted',
} as const;

function buildColumns(totalSteps: number): ColumnDef<OwnerMissingBusiness>[] {
  return [
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <div className="min-w-0">
          {row.original.owner_name && (
            <div className="truncate text-sm font-medium">
              {row.original.owner_name}
            </div>
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
      id: 'signed_up',
      header: 'Signed up',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.signed_up_at
            ? formatDateShort(row.original.signed_up_at)
            : '—'}
        </span>
      ),
    },
    {
      id: 'progress',
      header: 'Got as far as',
      cell: ({ row }) => {
        const step = row.original.furthest_step;
        // NULL is not "step 0". The funnel table only began recording on
        // 2026-08-15, so for the older backlog this genuinely means "we never
        // saw them" — a claim of no progress would be a fabrication.
        if (step == null) {
          return <span className="text-muted-foreground text-xs">Unknown</span>;
        }
        return (
          <Badge variant="outline">
            Step {step} of {totalSteps}
          </Badge>
        );
      },
    },
    {
      id: 'last_activity',
      header: 'Last seen',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.last_activity_at
            ? formatDateShort(row.original.last_activity_at)
            : '—'}
        </span>
      ),
    },
    {
      id: 'reminded',
      header: 'Last reminded',
      cell: ({ row }) =>
        row.original.registration_reminder_sent_at ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <MailCheck className="size-3" />
            {formatDateShort(row.original.registration_reminder_sent_at)}
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
          <SendRegistrationReminderButton ownerId={row.original.id} />
        </div>
      ),
    },
  ];
}

export function RegistrationFollowUpContent({
  rows,
  total,
  failed,
  page,
  pageSize,
  totalPages,
  search,
  onlyStarted,
  totalSteps,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const columns = React.useMemo(() => buildColumns(totalSteps), [totalSteps]);

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
    updateParams({ [PARAM.search]: value.trim() || null, [PARAM.page]: '1' });
  }, 400);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="only-started"
            checked={onlyStarted}
            onCheckedChange={(checked) =>
              updateParams({
                [PARAM.onlyStarted]: checked ? '1' : null,
                [PARAM.page]: '1',
              })
            }
          />
          <Label htmlFor="only-started" className="text-sm">
            Only owners who started the form
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            defaultValue={searchParams.get(PARAM.search) ?? ''}
            onSearch={handleSearch}
            placeholder="Search by name or email..."
            className="max-w-xs"
          />
          {/* Acts on the whole filter (server-derived), not just this page. */}
          <SendRegistrationAllButton
            count={total}
            search={search}
            onlyStarted={onlyStarted}
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
            [PARAM.page]:
              nextState.pageIndex === 0
                ? null
                : String(nextState.pageIndex + 1),
            [PARAM.perPage]:
              nextState.pageSize === 10 ? null : String(nextState.pageSize),
          });
        }}
        sorting={sorting}
        onSortingChange={setSorting}
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
              <PartyPopper className="text-muted-foreground size-8" />
              <p className="font-medium">Every owner has listed a shop</p>
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
