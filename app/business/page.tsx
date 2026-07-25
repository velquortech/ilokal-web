import { redirect } from 'next/navigation';
import { getMyBusinesses } from '@/lib/api/business/business';
import { businessPath, ROUTES } from '@/config/routeConfig';

export default async function BusinessIndexPage() {
  const business = await getMyBusinesses();
  if (!business) redirect(ROUTES.AUTH.SIGN_IN);
  redirect(businessPath(business.id));
}
