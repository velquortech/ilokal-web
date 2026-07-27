import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getBookingsEnabled } from '@/lib/api/appSettings';
import { getUserBookings } from '@/lib/api/bookings/bookingQuery';
import { CustomerBookingsContent } from './components/customer-bookings-content';

type SearchParams = Promise<{ page?: string }>;

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, bookingsEnabled, sp] = await Promise.all([
    getCurrentUser(),
    getBookingsEnabled(),
    searchParams,
  ]);

  // The /customer layout already gates role + account state; this route only
  // adds the platform kill switch.
  if (!user || !bookingsEnabled) notFound();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const result = await getUserBookings(user.id, { page, per_page: 12 });

  return (
    <CustomerBookingsContent
      failed={'error' in result}
      bookings={'error' in result ? [] : result.bookings}
      page={page}
      totalPages={'error' in result ? 1 : result.total_pages}
    />
  );
}
