import { createAnalyticsSupabaseClient } from '@/supabase/server';
import type {
  BusinessDashboard,
  ProductPerformance,
  CouponStats,
  TrafficMetrics,
  BusinessRevenue,
  RetentionMonth,
  MonthlyTrendPoint,
  FollowerFunnelData,
  CouponPerformanceItem,
  CustomerSegmentCounts,
  BusinessHealthData,
  AutomationSuggestion,
} from '@/lib/types';

export async function getBusinessDashboard(
  businessId: string,
): Promise<BusinessDashboard> {
  const supabase = await createAnalyticsSupabaseClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  // All four reads are independent — run them in parallel instead of serially
  // (was 4 sequential round trips). Counts use head:true (no row payload); the
  // revenue reads are sum() aggregates so they don't need an exact row count.
  const [
    { count: productCount },
    { count: activeProducts },
    { data: revenueData },
    { data: recentData },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active'),
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded')
      .eq('business_id', businessId),
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded')
      .eq('business_id', businessId)
      .gte('created_at', thirtyDaysAgo),
  ]);

  const totalRevenue =
    Array.isArray(revenueData) && revenueData.length
      ? Number(
          (revenueData[0] as unknown as Record<string, unknown>)['sum'] ?? 0,
        )
      : 0;

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
  const supabase = await createAnalyticsSupabaseClient();
  // ⚠️ NON-FUNCTIONAL: `payments` has no `product_id` column (payments are
  // subscription/business-level, not per-product — see .claude/PERFORMANCE_AUDIT.md
  // P3 note). This select errors on the missing column, so `data` is null and the
  // function always returns []. Fixing it needs a schema decision (link payments to
  // products, or derive product revenue from a different source) — not a query
  // rewrite. Left intact to avoid changing the response contract until then.
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
  const supabase = await createAnalyticsSupabaseClient();
  // Aggregated in SQL (analytics_coupon_redemption_stats) so it can't truncate at
  // the PostgREST 1000-row cap the way the old fetch-all-then-count did.
  const { data } = await supabase.rpc('analytics_coupon_redemption_stats', {
    p_business_id: businessId,
  });

  if (!Array.isArray(data)) return [];

  return (data as Array<{ coupon_id: string; redeemed: number }>).map(
    (row) => ({
      coupon_id: row.coupon_id,
      times_redeemed: Number(row.redeemed ?? 0),
    }),
  );
}

export async function getTrafficMetrics(
  businessId: string,
): Promise<TrafficMetrics> {
  const supabase = await createAnalyticsSupabaseClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  // Views live in `view_events` (there is no `page_views` table). Aggregated in
  // SQL (analytics_traffic_metrics: count + count(DISTINCT user_id)) so the
  // unique-visitor figure can't truncate at the PostgREST 1000-row cap.
  const { data } = await supabase.rpc('analytics_traffic_metrics', {
    p_business_id: businessId,
    p_since: thirtyDaysAgo,
  });

  const row =
    Array.isArray(data) && data.length
      ? (data[0] as { page_views: number; unique_visitors: number })
      : null;

  return {
    business_id: businessId,
    page_views_last_30_days: Number(row?.page_views ?? 0) || 0,
    unique_visitors_last_30_days: Number(row?.unique_visitors ?? 0) || 0,
  };
}

export async function getBusinessRevenue(
  businessId: string,
): Promise<BusinessRevenue> {
  const supabase = await createAnalyticsSupabaseClient();

  // Monthly window bounds
  const now = new Date();
  const months: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[label] = 0;
  }
  const earliest = new Date();
  earliest.setMonth(earliest.getMonth() - 5);
  earliest.setDate(1);
  const earliestIso = earliest.toISOString();

  // Total and the 6-month window are independent — fetch in parallel.
  const [{ data: totalData }, monthly] = await Promise.all([
    supabase
      .from('payments')
      .select('sum:sum(amount)')
      .eq('status', 'succeeded')
      .eq('business_id', businessId),
    supabase
      .from('payments')
      .select('created_at, amount')
      .eq('status', 'succeeded')
      .eq('business_id', businessId)
      .gte('created_at', earliestIso),
  ]);

  const totalRevenue =
    Array.isArray(totalData) && totalData.length
      ? Number((totalData[0] as unknown as Record<string, unknown>)['sum'] ?? 0)
      : 0;

  // Bucket the window rows into month labels (aggregated in JS to avoid
  // DB-specific group syntax; the 6-month window keeps the row count small).
  try {
    const { data } = monthly;
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

// ----------------------------------------------------------------
// Build 6-month window labels (oldest first)
// ----------------------------------------------------------------
function buildSixMonthLabels(): Array<{
  year: number;
  month: number;
  label: string;
}> {
  const now = new Date();
  const result: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString('en-US', { month: 'short' }),
    });
  }
  return result;
}

// ----------------------------------------------------------------
// getRetentionData
// ----------------------------------------------------------------
export async function getRetentionData(
  businessId: string,
  branchId?: string,
): Promise<RetentionMonth[]> {
  const supabase = await createAnalyticsSupabaseClient();
  // Aggregated in SQL (analytics_retention_months) so the per-month user sets
  // can't truncate at the PostgREST 1000-row cap. Rows come back oldest-first,
  // one per month of the trailing 6-month window — same order as the labels.
  const { data } = await supabase.rpc('analytics_retention_months', {
    p_business_id: businessId,
    p_branch_id: branchId ?? null,
  });

  const rows = Array.isArray(data)
    ? (data as Array<{
        new_customers: number;
        returning_customers: number;
        churned_customers: number;
      }>)
    : [];

  return buildSixMonthLabels().map(({ label }, idx) => ({
    month: label,
    new_customers: Number(rows[idx]?.new_customers ?? 0),
    returning_customers: Number(rows[idx]?.returning_customers ?? 0),
    churned_customers: Number(rows[idx]?.churned_customers ?? 0),
  }));
}

// ----------------------------------------------------------------
// getMonthlyTrend
// ----------------------------------------------------------------
export async function getMonthlyTrend(
  businessId: string,
  branchId?: string,
): Promise<MonthlyTrendPoint[]> {
  const supabase = await createAnalyticsSupabaseClient();
  // Aggregated in SQL (analytics_monthly_trend) — the old fetch-all follows +
  // redemptions reads truncated at the PostgREST 1000-row cap. Rows come back
  // oldest-first, one per month, matching the label order.
  const { data } = await supabase.rpc('analytics_monthly_trend', {
    p_business_id: businessId,
    p_branch_id: branchId ?? null,
  });

  const rows = Array.isArray(data)
    ? (data as Array<{ followers: number; redemptions: number }>)
    : [];

  return buildSixMonthLabels().map(({ label }, idx) => ({
    month: label,
    followers: Number(rows[idx]?.followers ?? 0),
    redemptions: Number(rows[idx]?.redemptions ?? 0),
  }));
}

// ----------------------------------------------------------------
// getFollowerFunnel
// ----------------------------------------------------------------
export async function getFollowerFunnel(
  businessId: string,
  branchId?: string,
): Promise<FollowerFunnelData> {
  const supabase = await createAnalyticsSupabaseClient();
  // Aggregated in SQL (analytics_follower_funnel) — count(DISTINCT ...) over
  // the full redemption/follow history instead of Set-deduping a rowset capped
  // at 1000 by PostgREST.
  const { data } = await supabase.rpc('analytics_follower_funnel', {
    p_business_id: businessId,
    p_branch_id: branchId ?? null,
  });

  const row =
    Array.isArray(data) && data.length
      ? (data[0] as {
          total_followers: number;
          ever_redeemed: number;
          active_30d: number;
          loyal: number;
        })
      : null;

  return {
    total_followers: Number(row?.total_followers ?? 0),
    ever_redeemed: Number(row?.ever_redeemed ?? 0),
    active_30d: Number(row?.active_30d ?? 0),
    loyal: Number(row?.loyal ?? 0),
  };
}

// ----------------------------------------------------------------
// getCouponPerformance
// ----------------------------------------------------------------
export async function getCouponPerformance(
  businessId: string,
  branchId?: string,
): Promise<CouponPerformanceItem[]> {
  const supabase = await createAnalyticsSupabaseClient();

  let couponsQuery = supabase
    .from('coupons')
    .select(
      'id, code, description, promotion_type, max_redemptions_global, start_date',
    )
    .eq('business_id', businessId)
    .eq('status', 'published')
    .is('archived_at', null);

  if (branchId) couponsQuery = couponsQuery.eq('branch_id', branchId);

  const { data: couponsData } = await couponsQuery;

  if (!Array.isArray(couponsData) || couponsData.length === 0) return [];

  // Per-coupon redemption count + avg days-to-redeem, aggregated in SQL (can't
  // truncate at the PostgREST 1000-row cap). The RPC returns rows for the whole
  // business; scope to branch when requested and index by coupon_id.
  const { data: statsData } = await supabase.rpc(
    'analytics_coupon_redemption_stats',
    { p_business_id: businessId, p_branch_id: branchId ?? null },
  );

  const redemptionMap = new Map<
    string,
    { redeemed: number; avgDays: number | null }
  >();
  if (Array.isArray(statsData)) {
    (
      statsData as Array<{
        coupon_id: string;
        redeemed: number;
        avg_days_to_redeem: number | null;
      }>
    ).forEach((s) => {
      redemptionMap.set(s.coupon_id, {
        redeemed: Number(s.redeemed ?? 0),
        avgDays:
          s.avg_days_to_redeem !== null && s.avg_days_to_redeem !== undefined
            ? Math.round(Number(s.avg_days_to_redeem))
            : null,
      });
    });
  }

  type CouponRow = {
    id: string;
    code: string;
    description: string | null;
    promotion_type: string;
    max_redemptions_global: number | null;
    start_date: string;
  };

  const result: CouponPerformanceItem[] = couponsData.map(
    (coupon: CouponRow) => {
      const stats = redemptionMap.get(coupon.id) ?? {
        redeemed: 0,
        avgDays: null,
      };
      const redeemed = stats.redeemed;
      const max = coupon.max_redemptions_global ?? null;
      const rate = max !== null ? Math.round((redeemed / max) * 100) : null;
      const avg_days_to_redeem = stats.avgDays;

      return {
        coupon_id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        promotion_type: coupon.promotion_type,
        max_redemptions: max,
        redeemed,
        rate,
        avg_days_to_redeem,
      };
    },
  );

  result.sort((a, b) => b.redeemed - a.redeemed);
  return result;
}

// ----------------------------------------------------------------
// getCustomerSegments
// ----------------------------------------------------------------
export async function getCustomerSegments(
  businessId: string,
  branchId?: string,
): Promise<CustomerSegmentCounts> {
  const supabase = await createAnalyticsSupabaseClient();
  // RFM bucketing in SQL (analytics_customer_segments) — the per-user
  // count/recency aggregation truncated at the PostgREST 1000-row cap when done
  // over a fetched rowset. The RPC's CASE cascades like the old if/else chain.
  const { data } = await supabase.rpc('analytics_customer_segments', {
    p_business_id: businessId,
    p_branch_id: branchId ?? null,
  });

  const row =
    Array.isArray(data) && data.length
      ? (data[0] as {
          champion: number;
          loyal: number;
          at_risk: number;
          lost: number;
          new_customer: number;
        })
      : null;

  return {
    champion: Number(row?.champion ?? 0),
    loyal: Number(row?.loyal ?? 0),
    at_risk: Number(row?.at_risk ?? 0),
    lost: Number(row?.lost ?? 0),
    new_customer: Number(row?.new_customer ?? 0),
  };
}

// ----------------------------------------------------------------
// getBusinessHealthIndicators
// ----------------------------------------------------------------
export async function getBusinessHealthIndicators(
  businessId: string,
  branchId?: string,
): Promise<BusinessHealthData> {
  const supabase = await createAnalyticsSupabaseClient();

  // Follower growth comes from the monthly-trend RPC (last two buckets) and
  // ratings from the rating-summary RPC — the old fetch-all follows/ratings
  // reads truncated at the PostgREST 1000-row cap.
  const [retention, trend, activeDealsResult, ratingSummaryResult] =
    await Promise.all([
      getRetentionData(businessId, branchId),
      getMonthlyTrend(businessId, branchId),
      supabase
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'published')
        .is('archived_at', null)
        .gt('expiry_date', new Date().toISOString()),
      supabase.rpc('analytics_rating_summary', { p_business_id: businessId }),
    ]);

  // Retention rate from last month (index 4) and this month (index 5)
  const lastMonthRetention = retention[4];
  const thisMonthRetention = retention[5];

  const calcRetentionRate = (r: RetentionMonth): number | null => {
    const total = r.new_customers + r.returning_customers;
    if (total === 0) return null;
    return Math.round((r.returning_customers / total) * 100);
  };

  const currentRate = thisMonthRetention
    ? calcRetentionRate(thisMonthRetention)
    : null;
  const prevRate = lastMonthRetention
    ? calcRetentionRate(lastMonthRetention)
    : null;

  let retention_trend: 'up' | 'down' | 'flat' = 'flat';
  if (currentRate !== null && prevRate !== null) {
    if (currentRate > prevRate) retention_trend = 'up';
    else if (currentRate < prevRate) retention_trend = 'down';
  }

  // Follower growth — trend rows are oldest-first, so [5] = this month,
  // [4] = last month.
  const thisMonthFollowers = Number(trend[5]?.followers ?? 0);
  const lastMonthFollowers = Number(trend[4]?.followers ?? 0);

  let follower_growth_trend: 'up' | 'down' | 'flat' = 'flat';
  if (thisMonthFollowers > lastMonthFollowers) follower_growth_trend = 'up';
  else if (thisMonthFollowers < lastMonthFollowers)
    follower_growth_trend = 'down';

  // Active deals
  const active_deals = Number(activeDealsResult.count ?? 0);

  // Avg rating
  const ratingSummary =
    Array.isArray(ratingSummaryResult.data) && ratingSummaryResult.data.length
      ? (ratingSummaryResult.data[0] as {
          avg_rating: number | null;
          ratings_count: number;
          this_month_avg: number | null;
          this_month_count: number;
          last_month_avg: number | null;
          last_month_count: number;
        })
      : null;

  let avg_rating: number | null = null;
  let rating_trend: 'up' | 'down' | 'flat' = 'flat';

  if (ratingSummary && Number(ratingSummary.ratings_count) > 0) {
    avg_rating = Math.round(Number(ratingSummary.avg_rating) * 10) / 10;

    // Compare this month vs last month ratings
    if (
      Number(ratingSummary.this_month_count) > 0 &&
      Number(ratingSummary.last_month_count) > 0
    ) {
      const thisAvg = Number(ratingSummary.this_month_avg);
      const lastAvg = Number(ratingSummary.last_month_avg);
      if (thisAvg > lastAvg) rating_trend = 'up';
      else if (thisAvg < lastAvg) rating_trend = 'down';
    }
  }

  return {
    retention_rate: currentRate,
    retention_trend,
    follower_growth: thisMonthFollowers,
    follower_growth_trend,
    active_deals,
    avg_rating,
    rating_trend,
  };
}

// ----------------------------------------------------------------
// generateAutomationSuggestions
// ----------------------------------------------------------------
export async function generateAutomationSuggestions(
  _businessId: string,
  health: BusinessHealthData,
  segments: CustomerSegmentCounts,
  funnel: FollowerFunnelData,
): Promise<AutomationSuggestion[]> {
  const suggestions: AutomationSuggestion[] = [];

  if (segments.at_risk > 3) {
    suggestions.push({
      id: 'win-back',
      message: `You have ${segments.at_risk} customers who haven't visited in 60–90 days. A win-back coupon could bring them back.`,
      severity: 'warning',
    });
  }

  if (health.retention_trend === 'down') {
    suggestions.push({
      id: 'retention-drop',
      message:
        'Customer retention dropped this month. Consider publishing a loyalty reward for returning customers.',
      severity: 'warning',
    });
  }

  if (
    funnel.total_followers > 0 &&
    funnel.ever_redeemed < Math.floor(funnel.total_followers / 2)
  ) {
    suggestions.push({
      id: 'convert-followers',
      message: `${funnel.total_followers - funnel.ever_redeemed} of your followers have never redeemed a deal. Try publishing a new offer to convert them.`,
      severity: 'info',
    });
  }

  if (health.avg_rating !== null && health.avg_rating >= 4.5) {
    suggestions.push({
      id: 'share-rating',
      message: `Your average rating is ${health.avg_rating.toFixed(1)}★. Share this on your profile to attract new customers.`,
      severity: 'success',
    });
  }

  if (health.active_deals === 0) {
    suggestions.push({
      id: 'no-active-deals',
      message:
        'You have no active deals published. Publish a deal to drive customer engagement.',
      severity: 'info',
    });
  }

  return suggestions;
}
