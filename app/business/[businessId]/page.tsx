import BusinessHome from './home/HomePage';
import { AnalyticsDashboard } from './home/AnalyticsDashboard';
import { getBusinessAnalyticsDashboardAction } from './actions/analyticsActions';
import { getBusinessById } from '@/lib/api/business/business';
import type { BusinessAnalyticsDashboard } from '@/lib/types';

type Params = Promise<{ businessId: string }>;

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

export default async function Page({ params }: { params: Params }) {
  const { businessId } = await params;
  const business = await getBusinessById(businessId);

  if (!business || business.status !== 'verified') {
    return <BusinessHome />;
  }

  const result = await getBusinessAnalyticsDashboardAction(businessId);
  const data = result.success ? result.data! : emptyDashboard;

  return <AnalyticsDashboard data={data} />;
}
