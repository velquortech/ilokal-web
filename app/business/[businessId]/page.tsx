import BusinessHome from './home/HomePage';
import { AnalyticsDashboard } from './home/AnalyticsDashboard';
import { getBusinessAnalyticsDashboardAction } from './actions/analyticsActions';
import {
  getBusinessBranchesAction,
  getBusinessBranchByIdAction,
} from './actions/branchActions';
import { getBusinessById } from '@/lib/api/business/business';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import {
  getOnboardingProgress,
  getOnboardingState,
} from '@/lib/api/business/onboardingQuery';
import { getOfferingVocabulary } from '@/lib/api/offerings/offeringQuery';
import { SetupChecklist } from '@/components/custom/onboarding/SetupChecklist';
import { TourWelcomeTrigger } from '@/components/custom/onboarding/TourWelcomeTrigger';
import {
  businessPathWithoutWelcome,
  ONBOARDING_WELCOME_PARAM,
} from '@/config/routeConfig';
import type { BusinessAnalyticsDashboard, Branch } from '@/lib/types';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const emptyDashboard: BusinessAnalyticsDashboard = {
  health: {
    retention_rate: null,
    retention_trend: 'flat',
    follower_growth: 0,
    follower_growth_trend: 'flat',
    active_deals: 0,
    avg_rating: null,
    rating_trend: 'flat',
  },
  trend: [],
  segments: { champion: 0, loyal: 0, at_risk: 0, lost: 0, new_customer: 0 },
  retention: [],
  funnel: { total_followers: 0, ever_redeemed: 0, active_30d: 0, loyal: 0 },
  couponPerformance: [],
  suggestions: [],
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ businessId }, sp] = await Promise.all([params, searchParams]);
  const branchId = typeof sp.branch === 'string' ? sp.branch : undefined;

  const business = await getBusinessById(businessId);

  // No business row yet: the pre-registration screen. Untouched by onboarding —
  // there is nothing to be onboarded into, and no id to key progress on.
  if (!business) {
    const { requireBusinessDocuments } = await getRegistrationSettings();
    return <BusinessHome requireDocuments={requireBusinessDocuments} />;
  }

  // The post-registration setup checklist rides ABOVE both branches below — a
  // pending shop and a freshly verified one both need it, and the verified case
  // is the common one on a default install (`auto_verify_businesses`).
  // Read the stored answers FIRST: it is `React.cache`d and the layout already
  // made it, so it is free — and a dismissed checklist means the five-read
  // derivation below would be thrown away. The pending branch is the exception:
  // it needs the offering count whether the card shows or not.
  const onboardingState = await getOnboardingState(businessId);
  const needsProgress =
    !onboardingState.checklistDismissed || business.status !== 'verified';

  // STARTED, not awaited: the analytics fetch below is the page's real payload
  // and must not queue behind the checklist's derivation. Both are in flight
  // together, and each branch awaits the pair it needs.
  const progressPromise = needsProgress
    ? getOfferingVocabulary(businessId).then((vocabulary) =>
        getOnboardingProgress(businessId, vocabulary),
      )
    : Promise.resolve(null);

  const welcome = sp[ONBOARDING_WELCOME_PARAM] === '1';
  const cleanUrl = welcome
    ? businessPathWithoutWelcome(businessId, sp)
    : undefined;

  const renderChecklist = (progress: Awaited<typeof progressPromise>) => (
    <>
      {/* Renders nothing, and is NOT inside the card: it owns both one-shot
          jobs — offering the tour and stripping the welcome marker — and the
          card is absent whenever the checklist has been dismissed. Leaving the
          strip in there left `?welcome=1` in the URL and history on that path,
          so a back-navigation replayed the invitation. */}
      <TourWelcomeTrigger welcome={welcome} cleanUrl={cleanUrl} />
      {progress && (
        <SetupChecklist
          businessId={businessId}
          progress={progress}
          welcome={welcome}
          dismissed={onboardingState.checklistDismissed}
        />
      )}
    </>
  );

  if (business.status !== 'verified') {
    const [progress, { requireBusinessDocuments }] = await Promise.all([
      progressPromise,
      getRegistrationSettings(),
    ]);

    // `undefined`, not `false`, when the count is unknown: a failed read must
    // not put "No products yet" beside the checklist's own "we couldn't load"
    // card. The TOTAL count, not the active one — the empty state asks whether
    // anything has been added, not whether it is visible.
    const hasOfferings =
      progress && !progress.failed
        ? progress.totalOfferingCount > 0
        : undefined;

    return (
      <div className="flex w-full flex-1 flex-col space-y-6">
        {renderChecklist(progress)}
        <BusinessHome
          requireDocuments={requireBusinessDocuments}
          hasOfferings={hasOfferings}
        />
      </div>
    );
  }

  // Branch mode: fetch analytics scoped to that branch + branch name
  if (branchId) {
    const [analyticsResult, branchResult, progress] = await Promise.all([
      getBusinessAnalyticsDashboardAction(businessId, branchId),
      getBusinessBranchByIdAction(branchId),
      progressPromise,
    ]);

    const data = analyticsResult.success
      ? analyticsResult.data!
      : emptyDashboard;
    const branchName = branchResult.success
      ? branchResult.data!.name
      : undefined;

    return (
      <div className="w-full space-y-6">
        {renderChecklist(progress)}
        <AnalyticsDashboard
          data={data}
          businessId={businessId}
          branchId={branchId}
          branchName={branchName}
        />
      </div>
    );
  }

  // All-branches mode: fetch business-wide analytics + branch list for summary
  const [analyticsResult, branchesResult, progress] = await Promise.all([
    getBusinessAnalyticsDashboardAction(businessId),
    getBusinessBranchesAction({ per_page: 50, status: 'all' }),
    progressPromise,
  ]);

  const data = analyticsResult.success ? analyticsResult.data! : emptyDashboard;
  const branches: Branch[] = branchesResult.success
    ? (branchesResult.data?.branches ?? [])
    : [];

  return (
    <div className="w-full space-y-6">
      {renderChecklist(progress)}
      <AnalyticsDashboard
        data={data}
        businessId={businessId}
        branches={branches}
      />
    </div>
  );
}
