import BusinessHome from './home/HomePage';
import { AnalyticsDashboard } from './home/AnalyticsDashboard';
import { getBusinessAnalyticsDashboardAction } from './actions/analyticsActions';
import {
  getBusinessBranchesAction,
  getBusinessBranchByIdAction,
} from './actions/branchActions';
import { getBusinessById } from '@/lib/api/business/business';
import { getRegistrationSettings } from '@/lib/api/appSettings';
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
  if (!business || business.status !== 'verified') {
    const { requireBusinessDocuments } = await getRegistrationSettings();
    return <BusinessHome requireDocuments={requireBusinessDocuments} />;
  }

  // Branch mode: fetch analytics scoped to that branch + branch name
  if (branchId) {
    const [analyticsResult, branchResult] = await Promise.all([
      getBusinessAnalyticsDashboardAction(businessId, branchId),
      getBusinessBranchByIdAction(branchId),
    ]);

    const data = analyticsResult.success
      ? analyticsResult.data!
      : emptyDashboard;
    const branchName = branchResult.success
      ? branchResult.data!.name
      : undefined;

    return (
      <AnalyticsDashboard
        data={data}
        businessId={businessId}
        branchId={branchId}
        branchName={branchName}
      />
    );
  }

  // All-branches mode: fetch business-wide analytics + branch list for summary
  const [analyticsResult, branchesResult] = await Promise.all([
    getBusinessAnalyticsDashboardAction(businessId),
    getBusinessBranchesAction({ per_page: 50, status: 'all' }),
  ]);

  const data = analyticsResult.success ? analyticsResult.data! : emptyDashboard;
  const branches: Branch[] = branchesResult.success
    ? (branchesResult.data?.branches ?? [])
    : [];

  return (
    <AnalyticsDashboard
      data={data}
      businessId={businessId}
      branches={branches}
    />
  );
}
