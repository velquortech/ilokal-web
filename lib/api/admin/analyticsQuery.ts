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
