import { notFound } from 'next/navigation';
import verifyBusinessOwner from '@/lib/api/verifyBusinessOwner';
import { getBookingsEnabled } from '@/lib/api/appSettings';
import {
  getBusinessBookings,
  getBookingStats,
} from '@/lib/api/bookings/bookingQuery';
import { BOOKING_STATUSES, type BookingStatus } from '@/lib/types/booking';
import { BookingsContent } from './components/bookings-content';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  status?: string;
}>;

export default async function BookingsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ businessId }, sp] = await Promise.all([params, searchParams]);

  const [verify, bookingsEnabled] = await Promise.all([
    verifyBusinessOwner(businessId),
    getBookingsEnabled(),
  ]);

  // The flag is a kill switch, not decoration: with bookings off the route
  // shouldn't exist at all. (The DB refuses new bookings independently.)
  if (!verify.authorized || !bookingsEnabled) notFound();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const perPage = Math.min(
    50,
    Math.max(5, parseInt(sp.perPage ?? '10', 10) || 10),
  );
  const status =
    typeof sp.status === 'string' &&
    (BOOKING_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as BookingStatus)
      : ('' as const);

  const [result, stats] = await Promise.all([
    getBusinessBookings(businessId, { page, per_page: perPage, status }),
    getBookingStats(businessId),
  ]);

  return (
    <BookingsContent
      businessId={businessId}
      // Distinguish "couldn't load" from "none yet" — an outage must not read
      // as an empty inbox.
      failed={'error' in result}
      bookings={'error' in result ? [] : result.bookings}
      metadata={
        'error' in result
          ? { total: 0, page, per_page: perPage, total_pages: 1 }
          : {
              total: result.total,
              page: result.page,
              per_page: result.per_page,
              total_pages: result.total_pages,
            }
      }
      stats={stats}
    />
  );
}
