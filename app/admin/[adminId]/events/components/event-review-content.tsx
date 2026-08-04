'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/custom/PageHeader';
import { SearchBar } from '@/components/custom/Searchbar';
import { FilterEvents } from '@/components/custom/events/FilterEvents';
import type {
  EventListMetadata,
  EventStats,
  EventStatus,
  EventWithRefs,
} from '@/lib/types';
import { EventReviewStats } from './event-review-stats';
import { StaffPickDialog } from './staff-pick-dialog';
import { EventsReviewTable } from './event-review-table/events-review-table';

interface EventReviewContentProps {
  events: EventWithRefs[];
  metadata: EventListMetadata;
  stats: EventStats;
  loadFailed: boolean;
  selectedStatus: EventStatus | '';
}

/**
 * The admin review queue, in the dashboard's table shape.
 *
 * `status` absent from the URL means `pending_review` here — the queue exists
 * to be emptied, and landing on "everything ever proposed" buries the three
 * rows that need a decision today. So "All" has to be spelled out as `all`,
 * which is why `FilterEvents` takes the value that means it.
 */
export function EventReviewContent({
  events,
  metadata,
  stats,
  loadFailed,
  selectedStatus,
}: EventReviewContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );

  React.useEffect(() => {
    setSearchInput(searchParams.get('search') ?? '');
  }, [searchParams]);

  const updateParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('search') ?? '';
      if (searchInput !== current) {
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // Keyed on the input alone — see events-content.tsx for why.
  }, [searchInput]);

  const handleStatusChange = React.useCallback(
    (status: string) => {
      updateParams({ status, page: '1' });
    },
    [updateParams],
  );

  const handlePaginationChange = React.useCallback(
    (page: number, pageSize: number) => {
      updateParams({
        page: page === 1 ? null : String(page),
        perPage: pageSize === 10 ? null : String(pageSize),
      });
    },
    [updateParams],
  );

  // The page resolves an absent param to `pending_review`; `''` means "all".
  const activeFilter = selectedStatus === '' ? 'all' : selectedStatus;

  return (
    <div className="font-giest flex h-max flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title="Events"
        lede="Approve what belongs on Explore. Every rejection needs a reason the shop can act on."
        action={
          <StaffPickDialog>
            <Button>
              <Plus />
              Add event
            </Button>
          </StaffPickDialog>
        }
      />

      <EventReviewStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <FilterEvents
              selectedStatus={activeFilter}
              onStatusChange={handleStatusChange}
              allValue="all"
            />
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <EventsReviewTable
            events={events}
            page={metadata.page}
            pageSize={metadata.per_page}
            totalPages={metadata.total_pages}
            onPaginationChange={handlePaginationChange}
            loadFailed={loadFailed}
            awaitingDecisionsOnly={selectedStatus === 'pending_review'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
