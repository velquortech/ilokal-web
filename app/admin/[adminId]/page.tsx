import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Users,
  Building2,
  BadgeCheck,
  UserPlus,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  getAdminDashboardSummary,
  getPlatformGrowth,
  getWelcomePostCandidates,
} from '@/lib/api/admin/analyticsQuery';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import { WELCOME_POST_NEW_DAYS } from '@/lib/types';
import { adminWelcomePostsPath } from '@/config/routeConfig';
import { Button } from '@/components/ui/button';
import { GrowthCharts } from './components/GrowthChart';
import { PageHeader } from '@/components/custom/PageHeader';

/**
 * The admin dashboard.
 *
 * Every number here used to be a literal — 1,050 users, 620 businesses, 24
 * pending documents, +18% growth, and both charts from a six-row const. The
 * data layer to replace them already existed and nothing rendered it.
 *
 * A server component. The stat cards read through the RLS-scoped client — an
 * admin already has full access to `profiles` and `businesses` — while the
 * growth chart goes through a service_role RPC that proves the admin role
 * first. Both call `lib/api` directly rather than `/api/admin/analytics/*`; an
 * RSC hitting our own HTTP route is a round trip to ourselves.
 *
 * No `export const dynamic`: the layout already declares it, and every read
 * awaits `cookies()`, which opts the route out of static rendering anyway.
 */

/**
 * An em dash, never a zero.
 *
 * `null` means this figure failed to load, and on a dashboard people act on,
 * "0" and "the query broke" must not look the same. The dash is `aria-hidden`
 * with real text beside it — on its own a screen reader announces the card
 * title and then silence.
 */
function StatValue({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div className="text-2xl font-bold">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Unavailable</span>
      </div>
    );
  }
  return <div className="text-2xl font-bold">{value.toLocaleString()}</div>;
}

/**
 * The charts are awaited separately so the four cheap card counts are not held
 * behind the platform-growth aggregate.
 */
async function GrowthSection() {
  const growth = await getPlatformGrowth();
  return <GrowthCharts buckets={growth.buckets} failed={growth.failed} />;
}

function GrowthSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading growth charts</span>
      <Skeleton className="h-96 w-full rounded-xl" aria-hidden="true" />
      <Skeleton className="h-96 w-full rounded-xl" aria-hidden="true" />
    </div>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ adminId: string }>;
}) {
  const [{ adminId }, summary, settings, welcome] = await Promise.all([
    params,
    getAdminDashboardSummary(),
    getRegistrationSettings(),
    getWelcomePostCandidates(),
  ]);

  /**
   * Only when there is genuinely something to post about.
   *
   * This is the "Pending Documents" rule, one PR old: a card that is always
   * present and always zero trains an admin to stop reading that corner of the
   * screen. A failed read shows nothing rather than a confident "0 new" — the
   * prompt is an invitation, and inventing one is worse than missing one.
   */
  // `newIds` is filtered on the cutoff in the query. Slicing `rows` by a count
  // only worked while the order held, and a null `created_at` sorts FIRST on a
  // DESC order — so a shop with no timestamp was read as the newest one.
  const newIds = welcome.failed ? [] : welcome.newIds;
  const showWelcomePrompt = newIds.length > 0;

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
    // Unknown flags: do not invent a queue. The strict fallback is
    // `autoVerifyBusinesses: false`, which is right for registration (it can
    // only be stricter) and wrong here, where it would conjure the permanently
    // zero card this fork exists to avoid.
    (!settings.failed && !settings.autoVerifyBusinesses) ||
    // Unknown count: show the card with an em dash rather than deciding, from
    // a failed read, that nothing is pending.
    summary.failed ||
    (summary.pending_businesses ?? 0) > 0;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader title="Dashboard" lede="Welcome back to iLokal Admin Panel" />

      {showWelcomePrompt && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-4 py-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Sparkles className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {welcome.newCount === 1
                    ? '1 new business registered'
                    : `${welcome.newCount} new businesses registered`}
                </p>
                <p className="text-muted-foreground text-sm">
                  Create their welcome post for Facebook, Instagram, Threads or
                  LinkedIn — registered in the last {WELCOME_POST_NEW_DAYS}{' '}
                  days.
                </p>
              </div>
            </div>
            {/* The two most recent are preselected, so the click lands on real
                work instead of an empty picker. */}
            <Button asChild className="shrink-0">
              <Link href={adminWelcomePostsPath(adminId, newIds.slice(0, 2))}>
                Create post
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
            <StatValue value={summary.total_users} />
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
            <StatValue value={summary.new_users_last_30_days} />
            <p className="text-muted-foreground text-xs">In the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <StatValue value={summary.total_businesses} />
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
              <StatValue value={summary.pending_businesses} />
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
              <StatValue value={summary.verified_businesses} />
              <p className="text-muted-foreground text-xs">
                Live and visible to shoppers
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Suspense fallback={<GrowthSkeleton />}>
        <GrowthSection />
      </Suspense>
    </div>
  );
}
