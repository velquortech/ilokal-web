import { redirect } from 'next/navigation';
import { getMyBusinesses } from '@/lib/api/business/business';
import { businessPath, ROUTES } from '@/config/routeConfig';

export default async function BusinessIndexPage() {
  // getMyBusinesses() throws 'Unauthorized' with no session (the proxy also
  // gates this path), so `!business` means a SIGNED-IN owner who has no live
  // business row yet — send them to registration, not back to the sign-in door.
  // Matches what signInAction/redirectByRole do for the same state.
  const business = await getMyBusinesses();
  if (!business) redirect(ROUTES.BUSINESS.registration);
  redirect(businessPath(business.id));
}
