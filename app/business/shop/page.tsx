import { redirect } from 'next/navigation';
import { getMyBusinesses } from '@/lib/api/business/business';
import { businessShopPath } from '@/config/routeConfig';

export default async function ShopIndexRedirect() {
  const business = await getMyBusinesses();
  if (!business) redirect('/business');
  redirect(businessShopPath(business.id));
}
