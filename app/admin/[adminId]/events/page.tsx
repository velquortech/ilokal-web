import { notFound } from 'next/navigation';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { getEventStats, getEventsForReview } from '@/lib/api/events/eventQuery';
import { searchTermSchema } from '@/lib/validation/events';
import { EVENT_STATUSES, type EventStatus } from '@/lib/types/event';
import { EventReviewContent } from './components/event-review-content';

// Cookie-authenticated, and the queue must never be served stale.
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  status?: string;
  search?: string;
}>;

export const metadata = {
  title: 'Events',
};

/**
 * Admin event review.
 *
 * Defaults to `pending_review` — the queue exists to be emptied, and landing on
 * "everything ever proposed" buries the three rows that need a decision today.
 *
 * Role is enforced by the `[adminId]` layout (and re-derived inside every
 * action); this page adds only the kill switch.
 */
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  if (!(await getEventsEnabled())) notFound();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const perPage = Math.min(
    50,
    Math.max(5, parseInt(sp.perPage ?? '10', 10) || 10),
  );
  const status =
    typeof sp.status === 'string' &&
    (EVENT_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as EventStatus)
      : sp.status === 'all'
        ? ('' as const)
        : ('pending_review' as EventStatus);
  const search =
    typeof sp.search === 'string'
      ? (searchTermSchema.safeParse(sp.search).data ?? undefined)
      : undefined;

  const [result, stats] = await Promise.all([
    getEventsForReview({
      page,
      per_page: perPage,
      status,
      search,
    }),
    // Counts span every status, so they are read separately from the filtered
    // page — the cards must not change when the filter does.
    getEventStats(),
  ]);

  return (
    <EventReviewContent
      events={result.events}
      metadata={result.metadata}
      stats={stats}
      loadFailed={'error' in result && result.error === 'LOAD_FAILED'}
      selectedStatus={status}
    />
  );
}
