import { notFound, redirect } from 'next/navigation';
import { ROUTES } from '@/config/routeConfig';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { fetchProfileForPage } from '@/lib/api/users/userService';
import { getBusinessProfileData } from '@/lib/api/business/businessQuery';
import { PersonalInfoForm } from './components/PersonalInfoForm';
import { BusinessInfoForm } from './components/BusinessInfoForm';
import { AccountStatusCard } from './components/AccountStatusCard';
import { PageHeader } from '@/components/custom/PageHeader';

type Params = Promise<{ businessId: string }>;

export default async function ProfilePage({ params }: { params: Params }) {
  const { businessId } = await params;

  const verify = await verifyBusinessOwner(businessId);

  if (!verify.authorized) {
    const err = verify.error;
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'AUTHENTICATION_ERROR'
    ) {
      redirect(ROUTES.AUTH.SIGN_IN);
    }
    notFound();
  }

  const userId = verify.user!.id;

  const [profile, business] = await Promise.all([
    fetchProfileForPage(userId),
    getBusinessProfileData(businessId),
  ]);

  if (!business) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Profile"
        lede="Manage your personal and business information."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PersonalInfoForm user={profile} />
          <BusinessInfoForm businessId={businessId} business={business} />
        </div>

        <div className="lg:col-span-1">
          <AccountStatusCard
            profileStatus={profile.status}
            role={profile.role}
            verificationStatus={business.status}
          />
        </div>
      </div>
    </div>
  );
}
