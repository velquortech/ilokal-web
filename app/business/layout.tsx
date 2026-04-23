import { getBusinessUserOrRedirect } from '@/lib/api/getCurrentUser';
import BusinessLayout from './components/BusinessLayout';
import { getMyBusinesses } from '@/lib/api/business/business';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getBusinessUserOrRedirect();
  const business_shop = await getMyBusinesses();
  return (
    <BusinessLayout user={user} shop={business_shop}>
      {children}
    </BusinessLayout>
  );
}
