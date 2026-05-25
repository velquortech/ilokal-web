'use client';

import type { BusinessAnalyticsDashboard } from '@/lib/types';
import {
  HealthScoreCard,
  MonthlyTrendChart,
  CustomerSegmentsChart,
  RetentionChart,
  FollowerFunnelCard,
  CouponPerformanceTable,
  AutomationSuggestions,
} from './components/dashboard';

interface AnalyticsDashboardProps {
  data: BusinessAnalyticsDashboard;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  return (
    <div className="-mx-10 -my-6 min-h-full w-full space-y-6 p-6">
      <HealthScoreCard health={data.health} />
      <div className="grid gap-6 lg:grid-cols-3">
        <MonthlyTrendChart trend={data.trend} />
        <CustomerSegmentsChart segments={data.segments} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <RetentionChart retention={data.retention} />
        <FollowerFunnelCard funnel={data.funnel} />
      </div>
      <CouponPerformanceTable coupons={data.couponPerformance} />
      <AutomationSuggestions suggestions={data.suggestions} />
    </div>
  );
}
