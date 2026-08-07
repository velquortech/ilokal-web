import { createServerSupabaseClient } from '@/supabase/server';
import type { PlatformAnalytics } from '@/lib/types';

export async function getPlatformOverview(): Promise<PlatformAnalytics> {
  const supabase = await createServerSupabaseClient();

  // Counts are head-only (no row payload) and the reads run in parallel.
  // "Active" businesses are verified + not archived — `is_active` never
  // existed on `businesses` (the old filter errored and always returned 0).
  const [
    { count: userCount, error: userErr },
    { count: bizCount, error: bizErr },
    { count: activeBizCount },
    { data: revenueData, error: revenueErr },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .is('archived_at', null),
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded'),
  ]);

  if (userErr) {
    console.error('[getPlatformOverview] user count error', userErr);
  }
  if (bizErr)
    console.error('[getPlatformOverview] business count error', bizErr);
  if (revenueErr)
    console.error('[getPlatformOverview] revenue error', revenueErr);

  const totalRevenue =
    Array.isArray(revenueData) && revenueData.length
      ? Number(
          (revenueData[0] as unknown as Record<string, unknown>)['sum'] ?? 0,
        )
      : 0;

  return {
    user_count: Number(userCount ?? 0) || 0,
    business_count: Number(bizCount ?? 0) || 0,
    active_business_count: Number(activeBizCount ?? 0) || 0,
    total_revenue: Number(totalRevenue) || 0,
  };
}

export async function getUserMetrics() {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const [{ count: total_users }, { count: new_users_last_30_days }] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),
    ]);

  return {
    total_users: Number(total_users ?? 0) || 0,
    new_users_last_30_days: Number(new_users_last_30_days ?? 0) || 0,
  };
}

export async function getRevenueMetrics() {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const [{ data: totalData }, { data: recentData }] = await Promise.all([
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded'),
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded')
      .gte('created_at', thirtyDaysAgo),
  ]);

  const total_revenue =
    Array.isArray(totalData) && totalData.length
      ? Number((totalData[0] as unknown as Record<string, unknown>)['sum'] ?? 0)
      : 0;
  const revenue_last_30_days =
    Array.isArray(recentData) && recentData.length
      ? Number(
          (recentData[0] as unknown as Record<string, unknown>)['sum'] ?? 0,
        )
      : 0;

  return {
    total_revenue: Number(total_revenue) || 0,
    revenue_last_30_days: Number(revenue_last_30_days) || 0,
  };
}

export async function getBusinessMetrics() {
  const supabase = await createServerSupabaseClient();

  // `is_active`/`is_suspended` never existed on `businesses` — the real state
  // lives in `status` ('pending'|'verified'|'suspended'|'rejected') plus
  // `archived_at`. The old filters errored and always returned 0.
  const [
    { count: total_businesses },
    { count: active_businesses },
    { count: suspended_businesses },
  ] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .is('archived_at', null),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'suspended'),
  ]);

  return {
    total_businesses: Number(total_businesses ?? 0) || 0,
    active_businesses: Number(active_businesses ?? 0) || 0,
    suspended_businesses: Number(suspended_businesses ?? 0) || 0,
  };
}

/**
 * Manila's UTC offset, fixed.
 *
 * Duplicated from `lib/utils/eventSchedule.ts` rather than imported: that
 * module is about a `datetime-local` form value and pulling it in here would
 * drag the whole event-schedule surface into an admin query for one constant.
 * The Philippines has not observed daylight saving since 1978 and sits at
 * +08:00 year-round, so the literal is exact.
 */
const MANILA_OFFSET = '+08:00';

export interface GrowthBucket {
  /** Short month label for the axis, e.g. "Jan". */
  month: string;
  users: number;
  businesses: number;
}

export interface PlatformGrowth {
  buckets: GrowthBucket[];
  /**
   * True when any count failed.
   *
   * Reported separately so the chart can say "we couldn't load this" instead
   * of drawing a flat line at zero — on an admin dashboard those look
   * identical and one of them is a decision made on bad information.
   */
  failed: boolean;
}

/**
 * New signups and new businesses per calendar month.
 *
 * Head-only COUNTS, one per bucket per entity — never `select('created_at')`
 * then group in Node. PostgREST caps returned rows at 1000, so a fetch-then-
 * group version starts silently under-reporting the moment the platform has
 * more than a thousand signups, which is exactly the failure the `analytics_*`
 * RPCs were written to remove. A count carries no rows, so it stays exact at
 * any size — which is also why this needs no migration.
 *
 * Month boundaries are pinned to Manila. The server runs in UTC, so an
 * unpinned boundary files eight hours of every month's signups into the
 * previous one.
 */
export async function getPlatformGrowth(
  months = 6,
  now: Date = new Date(),
): Promise<PlatformGrowth> {
  const supabase = await createServerSupabaseClient();

  // Boundaries are built from Manila's calendar, not the server's. `now` is
  // shifted into Manila first so that a request made at 23:00 UTC — already
  // the next day in Manila — lands in the right month.
  const manilaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const anchorYear = manilaNow.getUTCFullYear();
  const anchorMonth = manilaNow.getUTCMonth();

  const edges: { label: string; from: string; to: string }[] = [];
  for (let offset = months - 1; offset >= 0; offset--) {
    const start = new Date(Date.UTC(anchorYear, anchorMonth - offset, 1));
    const end = new Date(Date.UTC(anchorYear, anchorMonth - offset + 1, 1));
    const iso = (d: Date) =>
      `${d.toISOString().slice(0, 10)}T00:00:00${MANILA_OFFSET}`;
    edges.push({
      label: start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      from: new Date(iso(start)).toISOString(),
      to: new Date(iso(end)).toISOString(),
    });
  }

  const results = await Promise.all(
    edges.flatMap((edge) => [
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', edge.from)
        .lt('created_at', edge.to),
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', edge.from)
        .lt('created_at', edge.to),
    ]),
  );

  let failed = false;
  const buckets = edges.map((edge, index) => {
    const users = results[index * 2];
    const businesses = results[index * 2 + 1];
    if (users.error || businesses.error) {
      failed = true;
      if (users.error)
        console.error('[getPlatformGrowth] users', edge.label, users.error);
      if (businesses.error)
        console.error(
          '[getPlatformGrowth] businesses',
          edge.label,
          businesses.error,
        );
    }
    return {
      month: edge.label,
      users: Number(users.count ?? 0) || 0,
      businesses: Number(businesses.count ?? 0) || 0,
    };
  });

  return { buckets, failed };
}

export interface AdminDashboardSummary {
  total_users: number;
  new_users_last_30_days: number;
  total_businesses: number;
  verified_businesses: number;
  /** Shops still waiting on a human decision. */
  pending_businesses: number;
  /** Every count above failed to load — render nothing rather than zeros. */
  failed: boolean;
}

/**
 * The four numbers the dashboard's stat cards show.
 *
 * Separate from `getPlatformOverview` because that one carries `total_revenue`,
 * and this app has no billing surface — the billing routes were deleted as
 * dead in the 2026-07-17 audit, `payments` is empty, and a "₱0" card would
 * advertise a feature that does not exist.
 */
export async function getAdminDashboardSummary(
  now: Date = new Date(),
): Promise<AdminDashboardSummary> {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const [total, recent, businesses, verified, pending] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .is('archived_at', null),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('archived_at', null),
  ]);

  const reads = [total, recent, businesses, verified, pending];
  const failed = reads.some((read) => read.error);
  reads.forEach((read) => {
    if (read.error) console.error('[getAdminDashboardSummary]', read.error);
  });

  return {
    total_users: Number(total.count ?? 0) || 0,
    new_users_last_30_days: Number(recent.count ?? 0) || 0,
    total_businesses: Number(businesses.count ?? 0) || 0,
    verified_businesses: Number(verified.count ?? 0) || 0,
    pending_businesses: Number(pending.count ?? 0) || 0,
    failed,
  };
}
