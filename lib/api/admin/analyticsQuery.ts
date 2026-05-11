import { createServerSupabaseClient } from '@/supabase/server';
import type { PlatformAnalytics } from '@/lib/types';

export async function getPlatformOverview(): Promise<PlatformAnalytics> {
  const supabase = await createServerSupabaseClient();

  // Count users
  const { count: userCount, error: userErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' });
  if (userErr) {
    console.error('[getPlatformOverview] user count error', userErr);
  }

  // Count businesses and active businesses
  const { count: bizCount, error: bizErr } = await supabase
    .from('businesses')
    .select('id', { count: 'exact' });
  if (bizErr)
    console.error('[getPlatformOverview] business count error', bizErr);

  const { count: activeBizCount } = await supabase
    .from('businesses')
    .select('id', { count: 'exact' })
    .eq('is_active', true);

  // Total revenue (sum from payments)
  const { data: revenueData, error: revenueErr } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded');
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

  const { count: total_users } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' });

  const { count: new_users_last_30_days } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .gte('created_at', thirtyDaysAgo);

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

  const { data: totalData } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded');

  const { data: recentData } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded')
    .gte('created_at', thirtyDaysAgo);

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

  const { count: total_businesses } = await supabase
    .from('businesses')
    .select('id', { count: 'exact' });

  const { count: active_businesses } = await supabase
    .from('businesses')
    .select('id', { count: 'exact' })
    .eq('is_active', true);

  const { count: suspended_businesses } = await supabase
    .from('businesses')
    .select('id', { count: 'exact' })
    .eq('is_suspended', true);

  return {
    total_businesses: Number(total_businesses ?? 0) || 0,
    active_businesses: Number(active_businesses ?? 0) || 0,
    suspended_businesses: Number(suspended_businesses ?? 0) || 0,
  };
}
