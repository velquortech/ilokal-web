import { redirect } from 'next/navigation';
import { getBusinessUserOrRedirect } from '@/lib/api/getCurrentUser';
import BusinessLayout from './components/BusinessLayout';
import { getBusinessById } from '@/lib/api/business/business';
import verifyBusinessOwner from '@/lib/api/verifyBusinessOwner';
import { getBranchesByBusinessId } from '@/lib/api/branches/branchQuery';
import { getOfferingVocabulary } from '@/lib/api/offerings/offeringQuery';
import { getOnboardingState } from '@/lib/api/business/onboardingQuery';
import {
  getBookingsEnabled,
  getEventsEnabled,
  getOnboardingTourEnabled,
} from '@/lib/api/appSettings';
import type { Branch } from '@/lib/types';

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

  const [
    business_shop,
    branchesResult,
    vocabulary,
    bookingsEnabled,
    eventsEnabled,
    onboardingTourEnabled,
    // `React.cache`d — the dashboard page reads the same row for the
    // checklist's dismissal, and the two cannot pass props to each other.
    onboardingState,
  ] = await Promise.all([
    getBusinessById(businessId),
    getBranchesByBusinessId(businessId, { per_page: 100, status: 'active' }),
    // Resolved once per request and handed to the client tree, so the
    // catalogue dialogs never flash "Product" before "Service".
    getOfferingVocabulary(businessId),
    getBookingsEnabled(),
    getEventsEnabled(),
    getOnboardingTourEnabled(),
    getOnboardingState(businessId),
  ]);

  const branches = (branchesResult.branches ?? []) as Branch[];

  return (
    <BusinessLayout
      user={user}
      shop={business_shop}
      branches={branches}
      vocabulary={vocabulary}
      tourCompleted={onboardingState.tourCompleted}
      flags={{
        enable_bookings: bookingsEnabled,
        enable_events: eventsEnabled,
        enable_onboarding_tour: onboardingTourEnabled,
      }}
    >
      {children}
    </BusinessLayout>
  );
}
