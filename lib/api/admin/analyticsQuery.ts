import {
  createAnalyticsSupabaseClient,
  createServerSupabaseClient,
} from '@/supabase/server';
import { assertAuthorized } from '@/lib/utils/auth';
import type {
  AdminDashboardSummary,
  PlatformAnalytics,
  PlatformGrowth,
  WelcomePostCandidate,
  WelcomePostCandidates,
} from '@/lib/types';
import { WELCOME_POST_NEW_DAYS } from '@/lib/types';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

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
    console.error(
      '[getPlatformOverview] user count error',
      formatErrorForLog(userErr),
    );
  }
  if (bizErr)
    console.error(
      '[getPlatformOverview] business count error',
      formatErrorForLog(bizErr),
    );
  if (revenueErr)
    console.error(
      '[getPlatformOverview] revenue error',
      formatErrorForLog(revenueErr),
    );

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
 * The filter methods these counts actually use.
 *
 * A narrow local shape rather than PostgREST's own builder type: chaining that
 * generic through a callback makes TypeScript give up with "type instantiation
 * is excessively deep". Only the three methods used here are declared, so a
 * call site cannot quietly reach for something unvalidated.
 */
interface CountFilter {
  eq: (column: string, value: string) => CountFilter;
  is: (column: string, value: null) => CountFilter;
  gte: (column: string, value: string) => CountFilter;
}

/**
 * One head-only count, with its error kept rather than collapsed.
 *
 * Four readers in this file count the same two tables, and the scoping rules
 * (`archived_at IS NULL`, a status filter) were spelled out separately in each
 * — which is how two cards on one screen ended up disagreeing about what a
 * "business" is. One helper, one shape.
 *
 * `head: true` throughout: `select(...)` then `.length` silently truncates at
 * the PostgREST 1000-row cap.
 */
async function countRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  table: 'profiles' | 'businesses',
  apply?: (query: CountFilter) => CountFilter,
): Promise<{ count: number | null; failed: boolean }> {
  try {
    const base = supabase
      .from(table)
      .select('id', { count: 'exact', head: true }) as unknown as CountFilter;

    const { count, error } = (await (apply
      ? apply(base)
      : base)) as unknown as { count: number | null; error: unknown };

    if (error) {
      console.error(`[countRows] ${table}`, formatErrorForLog(error));
      return { count: null, failed: true };
    }
    return { count: Number(count ?? 0) || 0, failed: false };
  } catch (error: unknown) {
    // `createServerSupabaseClient` throws on missing env, and a thrown read
    // here would 500 a dashboard whose whole point is degrading to an em dash.
    console.error(`[countRows] ${table} threw`, formatErrorForLog(error));
    return { count: null, failed: true };
  }
}

export const MAX_GROWTH_MONTHS = 12;

/**
 * New signups and new businesses per calendar month.
 *
 * One `analytics_platform_growth` call — the aggregation is a grouped scan in
 * SQL, not twelve head-only counts from Node. The counts version was correct
 * (a count cannot truncate the way a fetch-then-group can) but it was twelve
 * sequential scans per render, each re-evaluating `is_admin()` per row under
 * RLS, and `profiles` carries two admin policies so that cost was paid twice.
 *
 * The RPC is SECURITY DEFINER and reads every profile and business on the
 * platform, so it is service_role only and **the caller proves admin first** —
 * the standing contract for every `analytics_*` function.
 *
 * No `now` parameter: month boundaries are Postgres's job now, computed in
 * Asia/Manila inside the function. A clock passed from Node would only be able
 * to disagree with it.
 */
export async function getPlatformGrowth(months = 6): Promise<PlatformGrowth> {
  const requested = Math.min(
    Math.max(Math.trunc(months) || 6, 1),
    MAX_GROWTH_MONTHS,
  );

  try {
    // Admin proven BEFORE the RLS-bypassing client is built, never after.
    const auth = await assertAuthorized(undefined, { roles: ['admin'] });
    if (!auth.authorized) return { buckets: [], failed: true };

    const supabase = await createAnalyticsSupabaseClient();
    const { data, error } = await supabase.rpc('analytics_platform_growth', {
      p_months: requested,
    });

    if (error) {
      console.error('[getPlatformGrowth]', formatErrorForLog(error));
      return { buckets: [], failed: true };
    }

    const rows = (data ?? []) as {
      month_start: string;
      users: number;
      businesses: number;
    }[];

    // The RPC already returns Manila-bucketed months oldest-first; the label is
    // formatted from the date string directly rather than through `new Date()`,
    // which would re-interpret a bare `YYYY-MM-DD` as UTC midnight and can slip
    // a month backwards west of Greenwich.
    const spansYears =
      new Set(rows.map((row) => row.month_start.slice(0, 4))).size > 1;

    return {
      buckets: rows.map((row) => ({
        month: formatMonthLabel(row.month_start, spansYears),
        users: Number(row.users ?? 0) || 0,
        businesses: Number(row.businesses ?? 0) || 0,
      })),
      failed: false,
    };
  } catch (error: unknown) {
    console.error('[getPlatformGrowth] threw', formatErrorForLog(error));
    return { buckets: [], failed: true };
  }
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2026-08-01` → `Aug`, or `Aug 26` when the window crosses a year. */
function formatMonthLabel(monthStart: string, spansYears: boolean): string {
  const [year, month] = monthStart.split('-');
  const name = MONTH_NAMES[Number(month) - 1] ?? month;
  return spansYears ? `${name} ${year.slice(2)}` : name;
}

/**
 * The four numbers the dashboard's stat cards show.
 *
 * Separate from `getPlatformOverview` because that one carries `total_revenue`,
 * and this app has no billing surface — the billing routes were deleted as
 * dead in the 2026-07-17 audit, `payments` is empty, and a "₱0" card would
 * advertise a feature that does not exist.
 *
 * Every count excludes archived rows. A soft-deleted account (mobile
 * `DELETE /me` sets `archived_at` and the web login gate 403s it) is not a
 * user anyone should be counting, and leaving it out of the total while the
 * verified count filters it is how two cards in one row disagree.
 */
export async function getAdminDashboardSummary(
  now: Date = new Date(),
): Promise<AdminDashboardSummary> {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const [total, recent, businesses, verified, pending] = await Promise.all([
    countRows(supabase, 'profiles', (q) => q.is('archived_at', null)),
    countRows(supabase, 'profiles', (q) =>
      q.is('archived_at', null).gte('created_at', thirtyDaysAgo),
    ),
    countRows(supabase, 'businesses', (q) => q.is('archived_at', null)),
    countRows(supabase, 'businesses', (q) =>
      q.eq('status', 'verified').is('archived_at', null),
    ),
    countRows(supabase, 'businesses', (q) =>
      q.eq('status', 'pending').is('archived_at', null),
    ),
  ]);

  return {
    total_users: total.count,
    new_users_last_30_days: recent.count,
    total_businesses: businesses.count,
    verified_businesses: verified.count,
    pending_businesses: pending.count,
    failed: [total, recent, businesses, verified, pending].some(
      (read) => read.failed,
    ),
  };
}

/**
 * Shops the admin might want to post a welcome card for.
 *
 * No marker column yet, so "new" is `created_at` within a window rather than
 * "not yet posted about". That means a shop can be posted twice if an admin is
 * not paying attention — the honest trade for shipping without touching a
 * migration backlog that is already 23 deep. A `welcome_post_generated_at`
 * column is the durable answer.
 *
 * **Verified shops only.** A `pending` or `rejected` registration is not
 * something to announce on iLokal's own accounts, and `suspended` is the
 * opposite of something to announce. The picker offering them was one careless
 * click away from a post that has to be deleted publicly.
 *
 * The window is counted in SQL and the ids for it come from the same filter,
 * so neither depends on where the fetched page happens to end.
 */
export async function getWelcomePostCandidates(
  limit = 60,
  now: Date = new Date(),
): Promise<WelcomePostCandidates> {
  const cutoff = new Date(
    now.getTime() - WELCOME_POST_NEW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const supabase = await createServerSupabaseClient();

    const [listed, windowed] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, shop_name, logo_url, created_at')
        .eq('status', 'verified')
        .is('archived_at', null)
        // NULLS LAST explicitly: Postgres puts them FIRST on a DESC order, so
        // the default would float a shop with no timestamp above every real
        // registration and the prompt would pick it as the newest.
        .order('created_at', { ascending: false, nullsFirst: false })
        .range(0, Math.max(0, limit - 1)),
      // Head-only: the number, without a second copy of the rows.
      supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'verified')
        .is('archived_at', null)
        .gte('created_at', cutoff),
    ]);

    if (listed.error || windowed.error) {
      console.error(
        '[getWelcomePostCandidates]',
        formatErrorForLog(listed.error ?? windowed.error),
      );
      return { rows: [], newIds: [], newCount: 0, failed: true };
    }

    const rows = (listed.data ?? []) as WelcomePostCandidate[];

    return {
      rows,
      // Filtered on the cutoff, not sliced by a count — the two agree only
      // while the order holds, and a null timestamp breaks the order.
      newIds: rows
        .filter((row) => row.created_at !== null && row.created_at >= cutoff)
        .map((row) => row.id),
      newCount: windowed.count ?? 0,
      failed: false,
    };
  } catch (error: unknown) {
    console.error('[getWelcomePostCandidates] threw', formatErrorForLog(error));
    return { rows: [], newIds: [], newCount: 0, failed: true };
  }
}
