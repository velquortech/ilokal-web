import { createServerSupabaseClient } from '@/supabase/server';
import type {
  BusinessDashboard,
  ProductPerformance,
  CouponStats,
  TrafficMetrics,
  BusinessRevenue,
} from '@/lib/types';

export async function getBusinessDashboard(
  businessId: string,
): Promise<BusinessDashboard> {
  const supabase = await createServerSupabaseClient();

  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('business_id', businessId);

  const { count: activeProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('is_active', true);

  const { data: revenueData } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded')
    .eq('business_id', businessId);

  const totalRevenue =
    Array.isArray(revenueData) && revenueData.length
      ? Number(
          (revenueData[0] as unknown as Record<string, unknown>)['sum'] ?? 0,
        )
      : 0;

  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const { data: recentData } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded')
    .eq('business_id', businessId)
    .gte('created_at', thirtyDaysAgo);

  const revenueLast30 =
    Array.isArray(recentData) && recentData.length
      ? Number(
          (recentData[0] as unknown as Record<string, unknown>)['sum'] ?? 0,
        )
      : 0;

  return {
    business_id: businessId,
    product_count: Number(productCount ?? 0) || 0,
    active_products: Number(activeProducts ?? 0) || 0,
    total_revenue: Number(totalRevenue) || 0,
    revenue_last_30_days: Number(revenueLast30) || 0,
  };
}

export async function getProductPerformance(
  businessId: string,
  limit = 10,
): Promise<ProductPerformance[]> {
  const supabase = await createServerSupabaseClient();
  // Fetch payments for the business and aggregate in JS to avoid DB-specific group syntax
  const { data } = await supabase
    .from('payments')
    .select('product_id, amount')
    .eq('business_id', businessId)
    .eq('status', 'succeeded');

  if (!Array.isArray(data)) return [];

  const map = new Map<string, { units: number; revenue: number }>();
  data.forEach((row: unknown) => {
    const r = row as Record<string, unknown>;
    const pid = String(r.product_id ?? '');
    if (!pid) return;
    const amt = Number(r.amount ?? 0);
    const cur = map.get(pid) ?? { units: 0, revenue: 0 };
    cur.units += 1;
    cur.revenue += amt;
    map.set(pid, cur);
  });

  const arr: ProductPerformance[] = Array.from(map.entries()).map(
    ([product_id, v]) => ({
      product_id,
      units_sold: v.units,
      revenue: v.revenue,
    }),
  );
  arr.sort((a, b) => b.revenue - a.revenue);
  return arr.slice(0, limit);
}

export async function getCouponStats(
  businessId: string,
): Promise<CouponStats[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('coupon_redemptions')
    .select('coupon_id, discount_amount')
    .eq('business_id', businessId);

  if (!Array.isArray(data)) return [];

  const map = new Map<string, { times: number; sum: number }>();
  data.forEach((row: unknown) => {
    const r = row as Record<string, unknown>;
    const cid = String(r.coupon_id ?? '');
    if (!cid) return;
    const amt = Number(r.discount_amount ?? 0);
    const cur = map.get(cid) ?? { times: 0, sum: 0 };
    cur.times += 1;
    cur.sum += amt;
    map.set(cid, cur);
  });

  return Array.from(map.entries()).map(([coupon_id, v]) => ({
    coupon_id,
    times_redeemed: v.times,
    total_discount_amount: v.sum,
  }));
}

export async function getTrafficMetrics(
  businessId: string,
): Promise<TrafficMetrics> {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const { count: pv } = await supabase
    .from('page_views')
    .select('id', { count: 'exact' })
    .eq('business_id', businessId)
    .gte('created_at', thirtyDaysAgo);

  const { data: uvData } = await supabase
    .from('page_views')
    .select('visitor_id')
    .eq('business_id', businessId)
    .gte('created_at', thirtyDaysAgo);
  const uv = Array.isArray(uvData)
    ? new Set(
        uvData.map((r: unknown) =>
          String((r as Record<string, unknown>).visitor_id),
        ),
      ).size
    : 0;

  return {
    business_id: businessId,
    page_views_last_30_days: Number(pv ?? 0) || 0,
    unique_visitors_last_30_days: Number(uv ?? 0) || 0,
  };
}

export async function getBusinessRevenue(
  businessId: string,
): Promise<BusinessRevenue> {
  const supabase = await createServerSupabaseClient();

  const { data: totalData } = await supabase
    .from('payments')
    .select('sum:sum(amount)', { count: 'exact' })
    .eq('status', 'succeeded')
    .eq('business_id', businessId);

  const totalRevenue =
    Array.isArray(totalData) && totalData.length
      ? Number((totalData[0] as unknown as Record<string, unknown>)['sum'] ?? 0)
      : 0;

  // Simple monthly breakdown last 6 months
  const now = new Date();
  const months: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[label] = 0;
  }

  // We'll attempt to query payments grouped by month; fallback to empty months if unsupported
  // Fetch payments for the last 6 months and aggregate in JS to avoid DB-specific group syntax
  try {
    const earliest = new Date();
    earliest.setMonth(earliest.getMonth() - 5);
    earliest.setDate(1);
    const earliestIso = earliest.toISOString();
    const { data } = await supabase
      .from('payments')
      .select('created_at, amount')
      .eq('status', 'succeeded')
      .eq('business_id', businessId)
      .gte('created_at', earliestIso);

    if (Array.isArray(data)) {
      data.forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const created = new Date(String(row.created_at));
        const label = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        if (label in months) months[label] += Number(row.amount ?? 0);
      });
    }
  } catch {
    // ignore SQL function mismatch in some DBs for tests
  }

  return {
    business_id: businessId,
    total_revenue: Number(totalRevenue) || 0,
    revenue_by_month: months,
  };
}
