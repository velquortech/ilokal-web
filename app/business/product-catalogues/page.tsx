import { redirect } from 'next/navigation';
import { getMyBusinesses } from '@/lib/api/business/business';
import { businessProductCataloguesPath } from '@/config/routeConfig';

export default async function ProductCataloguesRedirect() {
  const business = await getMyBusinesses();
  if (!business) redirect('/business');
  redirect(businessProductCataloguesPath(business.id));
}
