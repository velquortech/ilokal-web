'use client';

import { useState } from 'react';
import { BarChart3, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BusinessAnalyticsDashboard } from '@/lib/types';
import type { Branch } from '@/lib/types';
import {
  FirstAnswerCard,
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
import { logOwnerEvent } from '@/app/business/registration/actions/ownerEvents';

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
  const [showFullReport, setShowFullReport] = useState(false);

  const toggleFullReport = () => {
    const next = !showFullReport;
    setShowFullReport(next);
    if (next) {
      // Fire-and-forget funnel event: "Full report" is the one deliberate
      // action on the page, so the open is the interesting signal.
      void logOwnerEvent('dash_full_report_open', {}, businessId);
    }
  };

  return (
    // The layout already owns the page padding. This used to cancel it with
    // `-mx-10 -my-6` and re-apply its own, so any change to the shell's padding
    // silently broke alignment on this page and no other.
    <div className="w-full space-y-6">
      {isBranchMode && branchName && (
        <BranchContextBanner branchName={branchName} clearHref={clearHref} />
      )}

      {/* One answer first, supporting detail after. */}

      {/* The default view answers "how am I doing" with the headline, the four
          plain-language KPIs, any smart suggestions, and the coupon table —
          the checklist (rendered by the page above) is the next-action driver,
          so the charts that merely describe the past are one deliberate click
          away instead of competing for the first screenful. */}
      <FirstAnswerCard
        trend={data.trend}
        activeDeals={data.health.active_deals}
        businessId={businessId}
        branchId={branchId}
      />

      <HealthScoreCard health={data.health} />
      <AutomationSuggestions
        suggestions={data.suggestions}
        businessId={businessId}
      />

      <CouponPerformanceTable coupons={data.couponPerformance} />

      {showFullReport && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <MonthlyTrendChart trend={data.trend} />
            <CustomerSegmentsChart segments={data.segments} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <RetentionChart retention={data.retention} />
            <FollowerFunnelCard funnel={data.funnel} />
          </div>

          {!isBranchMode && branches && branches.length > 0 && (
            <BranchPerformanceSummary
              branches={branches}
              businessId={businessId}
            />
          )}
        </>
      )}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={toggleFullReport}
          aria-expanded={showFullReport}
          className="min-h-11"
        >
          {showFullReport ? (
            <ChevronUp className="mr-2 size-4" aria-hidden />
          ) : (
            <BarChart3 className="mr-2 size-4" aria-hidden />
          )}
          {showFullReport ? 'Show less' : 'See the full report'}
        </Button>
      </div>
    </div>
  );
}
