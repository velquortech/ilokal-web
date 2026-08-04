import { notFound } from 'next/navigation';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { getEventsEnabled } from '@/lib/api/appSettings';
import {
  getEventStats,
  getEventsForBusiness,
} from '@/lib/api/events/eventQuery';
import { getProductsPaginated } from '@/lib/api/products/productQuery';
import { searchTermSchema } from '@/lib/validation/events';
import { EVENT_STATUSES, type EventStatus } from '@/lib/types/event';
import { EventsContent } from './components/events-content';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  status?: string;
  search?: string;
}>;

export const metadata = {
  title: 'Events',
};

export default async function BusinessEventsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ businessId }, sp] = await Promise.all([params, searchParams]);

  const [verify, eventsEnabled] = await Promise.all([
    verifyBusinessOwner(businessId),
    getEventsEnabled(),
  ]);

  // The flag is a kill switch, not decoration: with events off this route does
  // not exist. The DB gates publication independently.
  if (!verify.authorized || !eventsEnabled) notFound();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const perPage = Math.min(
    50,
    Math.max(5, parseInt(sp.perPage ?? '10', 10) || 10),
  );
  const status =
    typeof sp.status === 'string' &&
    (EVENT_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as EventStatus)
      : ('' as const);
  const search =
    typeof sp.search === 'string'
      ? (searchTermSchema.safeParse(sp.search).data ?? undefined)
      : undefined;

  const [result, offerings, stats] = await Promise.all([
    getEventsForBusiness(businessId, {
      page,
      per_page: perPage,
      status,
      search,
    }),
    // For the "this event promotes…" picker. Bounded — a shop with 900
    // offerings gets a searchable list, not the whole catalogue in a select.
    getProductsPaginated({
      business_id: businessId,
      page: 1,
      per_page: 100,
      status: 'active',
    }),
    // Counts span every status, so they are read separately from the filtered
    // page — the cards must not change when the filter does.
    getEventStats(businessId),
  ]);

  return (
    <EventsContent
      businessId={businessId}
      events={result.events}
      metadata={result.metadata}
      stats={stats}
      // "Couldn't load" and "none yet" are different things to tell someone.
      loadFailed={'error' in result && result.error === 'LOAD_FAILED'}
      selectedStatus={status}
      offerings={
        'error' in offerings
          ? []
          : offerings.products.map((p) => ({ id: p.id, name: p.name }))
      }
    />
  );
}
