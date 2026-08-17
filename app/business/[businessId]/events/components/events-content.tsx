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
  EventStats as EventStatsType,
  EventStatus,
  EventWithRefs,
} from '@/lib/types';
import { EventDialog, type OfferingOption } from './event-dialog';
import { EventStats } from './event-stats';
import { EventsTable } from './event-table/events-table';

interface EventsContentProps {
  businessId: string;
  events: EventWithRefs[];
  metadata: EventListMetadata;
  stats: EventStatsType;
  loadFailed: boolean;
  selectedStatus: EventStatus | '';
  offerings: OfferingOption[];
}

/**
 * The owner's events, in the same shape as every other table in this
 * dashboard: header + stat cards + a card holding the toolbar and a
 * server-paginated `DataTable`.
 */
export function EventsContent({
  businessId,
  events,
  metadata,
  stats,
  loadFailed,
  selectedStatus,
  offerings,
}: EventsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );
  // The last search value THIS component pushed into the URL. The sync effect
  // below must ignore navigations we caused ourselves — otherwise, when the
  // debounce lands mid-typing, it resets the input to the URL value and
  // silently deletes every character typed during the server round-trip.
  // Same guard as `app/explore/components/explore-content.tsx`.
  const lastPushedSearch = React.useRef<string | null>(null);

  React.useEffect(() => {
    const urlValue = searchParams.get('search') ?? '';
    if (
      lastPushedSearch.current !== null &&
      urlValue === lastPushedSearch.current
    ) {
      return;
    }
    setSearchInput(urlValue);
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
        lastPushedSearch.current = searchInput;
        updateParams({ search: searchInput || null, page: '1' });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // Keyed on the URL too. `lastPushedSearch` is what makes the re-arm safe:
    // a navigation this component caused is ignored by the sync effect, so the
    // timer can only push text the owner actually typed. Keyed on the input
    // alone, a status filter clicked during the 400 ms window is wiped when
    // the search push rebuilds from a pre-click closure.
  }, [searchInput, searchParams, updateParams]);

  const handleStatusChange = React.useCallback(
    (status: string) => {
      updateParams({ status: status || null, page: '1' });
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

  return (
    <div className="font-giest flex h-max min-w-0 flex-1 flex-col space-y-6 pb-8">
      <PageHeader
        title="Events"
        lede="Propose an event and the iLokal team will review it before it goes live."
        action={
          <EventDialog businessId={businessId} offerings={offerings}>
            <Button>
              <Plus />
              Propose an event
            </Button>
          </EventDialog>
        }
      />

      <EventStats stats={stats} />

      <Card>
        <CardContent className="space-y-2">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <FilterEvents
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
            />
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <EventsTable
            businessId={businessId}
            events={events}
            offerings={offerings}
            page={metadata.page}
            pageSize={metadata.per_page}
            totalPages={metadata.total_pages}
            onPaginationChange={handlePaginationChange}
            loadFailed={loadFailed}
          />
        </CardContent>
      </Card>
    </div>
  );
}
