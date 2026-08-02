import type { Metadata } from 'next';
import { getPublicEvents } from '@/lib/api/events/eventQuery';
import { EVENT_TIME_FILTERS, type EventTimeFilter } from '@/lib/types/event';
import { EventsBrowser } from './components/events-browser';

export const metadata: Metadata = {
  title: "What's on",
  description:
    'Festivals, markets, pop-ups and gigs happening around Iloilo City.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );
  const perPage = Math.min(
    50,
    Math.max(
      6,
      parseInt(typeof sp.perPage === 'string' ? sp.perPage : '12', 10) || 12,
    ),
  );
  const search = typeof sp.search === 'string' ? sp.search : undefined;
  const when: EventTimeFilter =
    typeof sp.when === 'string' &&
    (EVENT_TIME_FILTERS as readonly string[]).includes(sp.when)
      ? (sp.when as EventTimeFilter)
      : 'upcoming';

  const result = await getPublicEvents({
    page,
    per_page: perPage,
    search,
    when,
  });

  return (
    <EventsBrowser
      events={result.events}
      metadata={result.metadata}
      // An outage must not read as "nothing is on".
      loadFailed={'error' in result && result.error === 'LOAD_FAILED'}
      when={when}
    />
  );
}
