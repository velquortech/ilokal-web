import { notFound, redirect } from 'next/navigation';
import { ROUTES } from '@/config/routeConfig';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { fetchProfileForPage } from '@/lib/api/users/userService';
import { getBusinessProfileData } from '@/lib/api/business/businessQuery';
import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import type { RawBusinessType } from '@/app/business/registration/api/fetchCategories';

// The service returns full DB rows (id included); RawBusinessType is the
// registration slice that omits it. The page needs the id for the pickers.
type BusinessTypeRow = RawBusinessType & { id: string };
import { PersonalInfoForm } from './components/PersonalInfoForm';
import {
  BusinessInfoForm,
  type ProfileBusinessTypeOption,
} from './components/BusinessInfoForm';
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

  // All ACTIVE verticals with their full category list — unlike the old
  // "categories that already have verified businesses" filter, the 4 new
  // types (Entertainment & Events, Health & Wellness, …) have zero shops
  // today, so their categories would never be offered. The owner can now
  // re-classify into any of them, same list as registration.
  const { data: typeRows } = await businessService.getBusinessTypes({
    onlyActive: true,
  });
  const rawTypes = (typeRows ?? []) as unknown as BusinessTypeRow[];
  const businessTypes: ProfileBusinessTypeOption[] = rawTypes.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    description: t.description,
    categories: (t.business_categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
    })),
  }));

  // Own-category safety: if the shop's current category belongs to a DISABLED
  // vertical (e.g. a legacy Tourism & Leisure shop), it would be invisible to
  // the active-only picker — keep it selectable so the owner is never stranded
  // with a category they cannot see or change.
  if (
    business.category_id &&
    !businessTypes.some((t) =>
      t.categories.some((c) => c.id === business.category_id),
    )
  ) {
    const { data: allTypeRows } = await businessService.getBusinessTypes();
    const ownType = ((allTypeRows ?? []) as unknown as BusinessTypeRow[]).find(
      (t) =>
        (t.business_categories ?? []).some(
          (c) => c.id === business.category_id,
        ),
    );
    if (ownType) {
      businessTypes.push({
        id: ownType.id,
        name: ownType.name,
        icon: ownType.icon,
        description: ownType.description,
        categories: (ownType.business_categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
        })),
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        title="Profile"
        lede="Manage your personal and business information."
      />

      {/* The shop's identity (banner + logo hero, then the editable business
          details) comes first — this IS the business profile page. The
          owner's personal info and account status follow below. */}
      <BusinessInfoForm
        businessId={businessId}
        business={business}
        businessTypes={businessTypes}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PersonalInfoForm user={profile} />
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
