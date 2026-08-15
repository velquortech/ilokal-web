export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { businessPath } from '@/config/routeConfig';
import { getBidaAnalyticsAction } from '../actions/analyticsActions';
import { BidaAnalyticsDashboard } from './components/BidaAnalyticsDashboard';

type Params = Promise<{ businessId: string }>;

export default async function InsightsPage({ params }: { params: Params }) {
  const { businessId } = await params;
  const result = await getBidaAnalyticsAction(businessId);

  return (
    <div className="w-full space-y-6">
      {/* Section header — the page owns its own heading (the shell provides
          the layout's title chrome for the section as a whole). The
          back-to-dashboard link keeps the page tethered to the main
          analytics (§6.5). */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Bida Ngayon Insights
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            How your items are trending on the Bida Ngayon board this week
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={businessPath(businessId)}>
            <BarChart3 className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      {/* §6.5: "Bida Ngayon" is a marketing concept with no primer — one line
          explaining what the board is, so the numbers have a home. */}
      <Alert className="border-primary/20 bg-primary/5">
        <Sparkles className="text-primary size-4" />
        <AlertDescription className="text-sm">
          Bida Ngayon is this week&rsquo;s trending board on iLokal — these
          insights show how your items perform there.
        </AlertDescription>
      </Alert>

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
