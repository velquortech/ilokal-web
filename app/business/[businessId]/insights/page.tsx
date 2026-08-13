export const dynamic = 'force-dynamic';

import { getBidaAnalyticsAction } from '../actions/analyticsActions';
import { BidaAnalyticsDashboard } from './components/BidaAnalyticsDashboard';

type Params = Promise<{ businessId: string }>;

export default async function InsightsPage({ params }: { params: Params }) {
  const { businessId } = await params;
  const result = await getBidaAnalyticsAction(businessId);

  return (
    <div className="w-full space-y-6">
      {/* Section header — the page owns its own heading (the shell provides
          the layout's title chrome for the section as a whole). */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Bida Ngayon Insights
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          How your items are trending on the Bida Ngayon board this week
        </p>
      </div>

      {!result.success ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          We couldn&rsquo;t load your Bida Ngayon insights right now. Try again
          in a moment.
        </div>
      ) : (
        <BidaAnalyticsDashboard data={result.data!} />
      )}
    </div>
  );
}
