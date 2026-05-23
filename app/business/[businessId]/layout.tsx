import { redirect } from 'next/navigation';
import { getBusinessUserOrRedirect } from '@/lib/api/getCurrentUser';
import BusinessLayout from './components/BusinessLayout';
import { getBusinessById } from '@/lib/api/business/business';
import verifyBusinessOwner from '@/lib/api/verifyBusinessOwner';

export const dynamic = 'force-dynamic';

type Params = Promise<{ businessId: string }>;

export default async function BusinessIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { businessId } = await params;

  const [user, verify] = await Promise.all([
    getBusinessUserOrRedirect(),
    verifyBusinessOwner(businessId),
  ]);

  if (!verify.authorized) redirect('/business');

  const business_shop = await getBusinessById(businessId);

  return (
    <BusinessLayout user={user} shop={business_shop}>
      {children}
    </BusinessLayout>
  );
}
