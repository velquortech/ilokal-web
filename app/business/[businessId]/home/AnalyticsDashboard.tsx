'use client';

import type { BusinessAnalyticsDashboard } from '@/lib/types';
import type { Branch } from '@/lib/types';
import {
  HealthScoreCard,
  MonthlyTrendChart,
  CustomerSegmentsChart,
  RetentionChart,
  FollowerFunnelCard,
  CouponPerformanceTable,
  AutomationSuggestions,
} from './components/dashboard';
import { BranchContextBanner } from './components/BranchContextBanner';
import { BranchPerformanceSummary } from './components/BranchPerformanceSummary';

interface AnalyticsDashboardProps {
  data: BusinessAnalyticsDashboard;
  businessId: string;
  branchId?: string;
  branchName?: string;
  branches?: Branch[];
}

export function AnalyticsDashboard({
  data,
  businessId,
  branchId,
  branchName,
  branches,
}: AnalyticsDashboardProps) {
  const isBranchMode = !!branchId;
  const clearHref = `/business/${businessId}`;

  return (
    <div className="-mx-10 -my-6 min-h-full w-full space-y-6 p-6">
      {isBranchMode && branchName && (
        <BranchContextBanner branchName={branchName} clearHref={clearHref} />
      )}

      <HealthScoreCard health={data.health} />
      <AutomationSuggestions suggestions={data.suggestions} />

      <div className="grid gap-6 lg:grid-cols-3">
        <MonthlyTrendChart trend={data.trend} />
        <CustomerSegmentsChart segments={data.segments} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RetentionChart retention={data.retention} />
        <FollowerFunnelCard funnel={data.funnel} />
      </div>

      <CouponPerformanceTable coupons={data.couponPerformance} />

      {!isBranchMode && branches && branches.length > 0 && (
        <BranchPerformanceSummary branches={branches} businessId={businessId} />
      )}
    </div>
  );
}
