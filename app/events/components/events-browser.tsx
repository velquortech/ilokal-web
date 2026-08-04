'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/custom/Searchbar';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { EventCard } from './event-card';
import type {
  EventListMetadata,
  EventTimeFilter,
  EventWithRefs,
} from '@/lib/types';

const WHEN_FILTERS: Array<{ value: EventTimeFilter; label: string }> = [
  { value: 'upcoming', label: "What's on" },
  { value: 'past', label: 'Finished' },
  { value: 'all', label: 'Everything' },
];

interface EventsBrowserProps {
  events: EventWithRefs[];
  metadata: EventListMetadata;
  loadFailed: boolean;
  when: EventTimeFilter;
}

export function EventsBrowser({
  events,
  metadata,
  loadFailed,
  when,
}: EventsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    searchParams.get('search') ?? '',
  );

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
    // Keyed on the input alone, so a navigation cannot re-arm it mid-typing.
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">What&rsquo;s on</h1>
        <p className="text-muted-foreground">
          Festivals, markets, pop-ups and gigs around Iloilo.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {WHEN_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={when === value ? 'default' : 'ghost'}
              onClick={() => updateParams({ when: value, page: '1' })}
            >
              {label}
            </Button>
          ))}
        </div>
        <SearchBar
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {loadFailed ? (
        <EmptyState
          icon={TriangleAlert}
          title="We couldn't load what's on"
          body="Something went wrong on our side. Try again in a moment."
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            searchInput
              ? 'Nothing matches that'
              : when === 'past'
                ? 'Nothing finished yet'
                : 'Nothing on right now'
          }
          body={
            searchInput
              ? 'Try a different word, or browse everything.'
              : 'Check back soon — new events are added as they are approved.'
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ul>
      )}

      <PaginationBar metadata={metadata} noun="event" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Icon className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}
