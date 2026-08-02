import { notFound } from 'next/navigation';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { getEventsForReview } from '@/lib/api/events/eventQuery';
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
  title: 'Event Proposals',
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
  const search = typeof sp.search === 'string' ? sp.search : undefined;

  const result = await getEventsForReview({
    page,
    per_page: perPage,
    status,
    search,
  });

  return (
    <EventReviewContent
      events={result.events}
      metadata={result.metadata}
      loadFailed={'error' in result && result.error === 'LOAD_FAILED'}
      selectedStatus={status}
    />
  );
}
