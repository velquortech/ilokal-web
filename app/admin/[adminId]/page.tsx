import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, BadgeCheck, UserPlus, Clock } from 'lucide-react';
import {
  getAdminDashboardSummary,
  getPlatformGrowth,
} from '@/lib/api/admin/analyticsQuery';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import { GrowthCharts } from './components/GrowthChart';

/**
 * The admin dashboard.
 *
 * Every number here used to be a literal — 1,050 users, 620 businesses, 24
 * pending documents, +18% growth, and both charts from a six-row const. The
 * data layer to replace them already existed and nothing rendered it.
 *
 * A server component: the reads are admin-scoped and RLS already grants an
 * admin full access to `profiles` and `businesses`, so this needs neither the
 * service-role client nor a client-side fetch. It calls `lib/api` directly
 * rather than `/api/admin/analytics/*` — an RSC hitting our own HTTP route is
 * a network round trip to ourselves.
 */
export const dynamic = 'force-dynamic';

/** An em dash, not a zero — see `failed` on the query. */
function StatValue({ value, failed }: { value: number; failed: boolean }) {
  return (
    <div className="text-2xl font-bold">
      {failed ? '—' : value.toLocaleString()}
    </div>
  );
}

export default async function DashboardPage() {
  const [summary, growth, settings] = await Promise.all([
    getAdminDashboardSummary(),
    getPlatformGrowth(),
    getRegistrationSettings(),
  ]);

  /**
   * The review queue is only a real queue when something can enter it.
   *
   * With `auto_verify_businesses` on, `set_business_initial_status` publishes
   * every new shop immediately, so `pending` is structurally zero. A card that
   * is permanently 0 trains an admin to stop reading that corner of the
   * screen, which is worse than not showing it — so it appears only when the
   * flag makes it meaningful, or when something is genuinely waiting.
   */
  const showReviewQueue =
    !settings.autoVerifyBusinesses || summary.pending_businesses > 0;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to iLokal Admin Panel
        </p>
      </div>

      {summary.failed && (
        <Card className="border-destructive/40">
          <CardContent className="text-muted-foreground py-4 text-sm">
            We couldn’t load some of these figures. The numbers below may be
            incomplete — refresh in a moment rather than acting on them.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <StatValue value={summary.total_users} failed={summary.failed} />
            <p className="text-muted-foreground text-xs">
              Everyone with an account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Sign-ups (30d)
            </CardTitle>
            <UserPlus className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {/* Replaces "Growth Rate +18%", which had no definition anywhere —
                no formula, no period, no source. A count over a stated window
                is a number someone can check. */}
            <StatValue
              value={summary.new_users_last_30_days}
              failed={summary.failed}
            />
            <p className="text-muted-foreground text-xs">In the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <StatValue
              value={summary.total_businesses}
              failed={summary.failed}
            />
            <p className="text-muted-foreground text-xs">Registered shops</p>
          </CardContent>
        </Card>

        {showReviewQueue ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Awaiting Review
              </CardTitle>
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <StatValue
                value={summary.pending_businesses}
                failed={summary.failed}
              />
              <p className="text-muted-foreground text-xs">
                Shops pending verification
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Verified Shops
              </CardTitle>
              <BadgeCheck className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <StatValue
                value={summary.verified_businesses}
                failed={summary.failed}
              />
              <p className="text-muted-foreground text-xs">
                Live and visible to shoppers
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <GrowthCharts buckets={growth.buckets} failed={growth.failed} />
    </div>
  );
}
