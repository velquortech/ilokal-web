import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBusinessUserOrRedirect } from '@/lib/api/getCurrentUser';
import BusinessLayout from './components/BusinessLayout';
import { getBusinessById } from '@/lib/api/business/business';
import verifyBusinessOwner from '@/lib/api/verifyBusinessOwner';
import { getBranchesByBusinessId } from '@/lib/api/branches/branchQuery';
import { getOfferingVocabulary } from '@/lib/api/offerings/offeringQuery';
import { getOnboardingState } from '@/lib/api/business/onboardingQuery';
import {
  SIDEBAR_COOKIE_NAME,
  sidebarDefaultOpen,
} from '@/config/sidebarCookie';
import {
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

  const [user, verify, cookieStore] = await Promise.all([
    getBusinessUserOrRedirect(),
    verifyBusinessOwner(businessId),
    cookies(),
  ]);

  if (!verify.authorized) redirect('/business');

  // Seeded on the SERVER so the first paint already matches the owner's own
  // choice. `SidebarProvider` has always written this cookie and nothing ever
  // read it, so collapsing the sidebar never survived a reload.
  const defaultSidebarOpen = sidebarDefaultOpen(
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
  );

  const [
    business_shop,
    branchesResult,
    vocabulary,
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
      sidebarDefaultOpen={defaultSidebarOpen}
      tourCompleted={onboardingState.tourCompleted}
      flags={{
        enable_events: eventsEnabled,
        enable_onboarding_tour: onboardingTourEnabled,
      }}
    >
      {children}
    </BusinessLayout>
  );
}
