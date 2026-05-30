import { redirect } from 'next/navigation';
import { getMyBusinesses } from '@/lib/api/business/business';
import { businessPath } from '@/config/routeConfig';

export default async function BusinessIndexPage() {
  const business = await getMyBusinesses();
  if (!business) redirect('/login/business');
  redirect(businessPath(business.id));
}
