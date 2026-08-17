import { PageHeader } from '@/components/custom/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { listBidaPicks } from '@/lib/api/admin/bidaOfTheDayQuery';
import { BidaOfTheDayAdmin } from './components/bida-of-the-day-admin';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * Bida of the Day — the editorial daily star on the mobile board's hero.
 *
 * Admin-only (the `[adminId]` layout redirects non-admins). One pick per
 * `pick_date`; the mobile route resolves the most recent pick ≤ today via the
 * `bida_of_the_day` RPC, so a future date here is a pre-scheduled pick that
 * goes live at midnight. The seeded demo picks (seeds/bida_of_the_day.sql)
 * are superseded by this surface — upserting a date replaces its row.
 */
export default async function BidaOfTheDayPage() {
  let initialPicks: Awaited<ReturnType<typeof listBidaPicks>> = [];
  try {
    initialPicks = await listBidaPicks();
  } catch (error) {
    console.error(
      '[bida-of-the-day page] failed to load picks',
      formatErrorForLog(error),
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader
        title="Bida of the Day"
        lede="Schedule the daily star that leads the mobile board's hero rotation"
      />

      <BidaOfTheDayAdmin initialPicks={initialPicks} />

      <Card>
        <CardContent className="text-muted-foreground py-4 text-sm">
          The board resolves the most recent pick on or before today — future
          dates are queued and go live at midnight, and a day without a pick
          falls back to the algorithmic top-5 rotation.
        </CardContent>
      </Card>
    </div>
  );
}
