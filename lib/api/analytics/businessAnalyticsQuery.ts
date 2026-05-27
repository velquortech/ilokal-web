import { createServerSupabaseClient } from '@/supabase/server';
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
    .from('user_redemptions')
    .select('coupon_id')
    .in(
      'coupon_id',
      (
        await supabase
          .from('coupons')
          .select('id')
          .eq('business_id', businessId)
      ).data?.map((c: { id: string }) => c.id) ?? [],
    );

  if (!Array.isArray(data)) return [];

  const map = new Map<string, number>();
  data.forEach((row: unknown) => {
    const r = row as Record<string, unknown>;
    const cid = String(r.coupon_id ?? '');
    if (!cid) return;
    map.set(cid, (map.get(cid) ?? 0) + 1);
  });

  return Array.from(map.entries()).map(([coupon_id, times]) => ({
    coupon_id,
    times_redeemed: times,
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

// ----------------------------------------------------------------
// Helper: get coupon IDs for a business (non-archived)
// ----------------------------------------------------------------
async function getBusinessCouponIds(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  businessId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('coupons')
    .select('id')
    .eq('business_id', businessId)
    .is('archived_at', null);

  if (!Array.isArray(data)) return [];
  return data.map((r: { id: string }) => r.id);
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
): Promise<RetentionMonth[]> {
  const supabase = await createServerSupabaseClient();
  const couponIds = await getBusinessCouponIds(supabase, businessId);

  if (couponIds.length === 0) {
    return buildSixMonthLabels().map(({ label }) => ({
      month: label,
      new_customers: 0,
      returning_customers: 0,
      churned_customers: 0,
    }));
  }

  const { data: rawRedemptions } = await supabase
    .from('user_redemptions')
    .select('user_id, redeemed_at')
    .in('coupon_id', couponIds);

  const redemptions: Array<{ user_id: string; redeemed_at: string }> =
    Array.isArray(rawRedemptions)
      ? (rawRedemptions as Array<{ user_id: string; redeemed_at: string }>)
      : [];

  const months = buildSixMonthLabels();

  // For each month, track which users redeemed
  const monthUserSets: Set<string>[] = months.map(() => new Set<string>());

  redemptions.forEach(({ user_id, redeemed_at }) => {
    const d = new Date(redeemed_at);
    months.forEach(({ year, month }, idx) => {
      if (d.getFullYear() === year && d.getMonth() === month) {
        monthUserSets[idx].add(user_id);
      }
    });
  });

  return months.map(({ label }, idx) => {
    const currentSet = monthUserSets[idx];
    const prevSet = idx > 0 ? monthUserSets[idx - 1] : new Set<string>();

    let new_customers = 0;
    let returning_customers = 0;

    currentSet.forEach((uid) => {
      if (prevSet.has(uid)) {
        returning_customers += 1;
      } else {
        new_customers += 1;
      }
    });

    // Churned = were active last month but not this month
    let churned_customers = 0;
    prevSet.forEach((uid) => {
      if (!currentSet.has(uid)) {
        churned_customers += 1;
      }
    });

    return {
      month: label,
      new_customers,
      returning_customers,
      churned_customers,
    };
  });
}

// ----------------------------------------------------------------
// getMonthlyTrend
// ----------------------------------------------------------------
export async function getMonthlyTrend(
  businessId: string,
): Promise<MonthlyTrendPoint[]> {
  const supabase = await createServerSupabaseClient();

  const [subResult, couponIds] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('created_at')
      .eq('business_id', businessId),
    getBusinessCouponIds(supabase, businessId),
  ]);

  const subscriptions: Array<{ created_at: string }> = Array.isArray(
    subResult.data,
  )
    ? (subResult.data as Array<{ created_at: string }>)
    : [];

  let redemptions: Array<{ redeemed_at: string }> = [];
  if (couponIds.length > 0) {
    const { data: redData } = await supabase
      .from('user_redemptions')
      .select('redeemed_at')
      .in('coupon_id', couponIds);
    redemptions = Array.isArray(redData)
      ? (redData as Array<{ redeemed_at: string }>)
      : [];
  }

  const months = buildSixMonthLabels();

  return months.map(({ year, month, label }) => {
    const followers = subscriptions.filter(({ created_at }) => {
      const d = new Date(created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    const redemptionCount = redemptions.filter(({ redeemed_at }) => {
      const d = new Date(redeemed_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    return { month: label, followers, redemptions: redemptionCount };
  });
}

// ----------------------------------------------------------------
// getFollowerFunnel
// ----------------------------------------------------------------
export async function getFollowerFunnel(
  businessId: string,
): Promise<FollowerFunnelData> {
  const supabase = await createServerSupabaseClient();

  const [subResult, couponIds] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('user_id')
      .eq('business_id', businessId),
    getBusinessCouponIds(supabase, businessId),
  ]);

  const total_followers = Array.isArray(subResult.data)
    ? subResult.data.length
    : 0;

  if (couponIds.length === 0) {
    return { total_followers, ever_redeemed: 0, active_30d: 0, loyal: 0 };
  }

  const { data: redData } = await supabase
    .from('user_redemptions')
    .select('user_id, redeemed_at')
    .in('coupon_id', couponIds);

  const redemptions: Array<{ user_id: string; redeemed_at: string }> =
    Array.isArray(redData)
      ? (redData as Array<{ user_id: string; redeemed_at: string }>)
      : [];

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const everRedeemedSet = new Set<string>();
  const active30dSet = new Set<string>();
  // Track months per user for loyalty check
  const userMonths = new Map<string, Set<string>>();

  redemptions.forEach(({ user_id, redeemed_at }) => {
    everRedeemedSet.add(user_id);

    const ts = new Date(redeemed_at).getTime();
    if (ts >= thirtyDaysAgo) {
      active30dSet.add(user_id);
    }

    // Track calendar months redeemed (YYYY-MM)
    const d = new Date(redeemed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!userMonths.has(user_id)) userMonths.set(user_id, new Set());
    userMonths.get(user_id)!.add(key);
  });

  let loyal = 0;
  userMonths.forEach((months) => {
    if (months.size >= 2) loyal += 1;
  });

  return {
    total_followers,
    ever_redeemed: everRedeemedSet.size,
    active_30d: active30dSet.size,
    loyal,
  };
}

// ----------------------------------------------------------------
// getCouponPerformance
// ----------------------------------------------------------------
export async function getCouponPerformance(
  businessId: string,
): Promise<CouponPerformanceItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: couponsData } = await supabase
    .from('coupons')
    .select(
      'id, code, description, promotion_type, max_redemptions_global, start_date',
    )
    .eq('business_id', businessId)
    .eq('status', 'published')
    .is('archived_at', null);

  if (!Array.isArray(couponsData) || couponsData.length === 0) return [];

  const couponIds = couponsData.map((c: { id: string }) => c.id);

  const { data: redData } = await supabase
    .from('user_redemptions')
    .select('coupon_id, redeemed_at')
    .in('coupon_id', couponIds);

  const redemptions: Array<{ coupon_id: string; redeemed_at: string }> =
    Array.isArray(redData)
      ? (redData as Array<{ coupon_id: string; redeemed_at: string }>)
      : [];

  // Group redemptions by coupon_id
  const redemptionMap = new Map<string, { count: number; dates: number[] }>();
  redemptions.forEach(({ coupon_id, redeemed_at }) => {
    const existing = redemptionMap.get(coupon_id) ?? { count: 0, dates: [] };
    existing.count += 1;
    existing.dates.push(new Date(redeemed_at).getTime());
    redemptionMap.set(coupon_id, existing);
  });

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
      const stats = redemptionMap.get(coupon.id) ?? { count: 0, dates: [] };
      const redeemed = stats.count;
      const max = coupon.max_redemptions_global ?? null;
      const rate = max !== null ? Math.round((redeemed / max) * 100) : null;

      let avg_days_to_redeem: number | null = null;
      if (stats.dates.length > 0) {
        const startMs = new Date(coupon.start_date).getTime();
        const totalDays = stats.dates.reduce(
          (sum, ts) => sum + (ts - startMs) / (1000 * 60 * 60 * 24),
          0,
        );
        avg_days_to_redeem = Math.round(totalDays / stats.dates.length);
      }

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
): Promise<CustomerSegmentCounts> {
  const supabase = await createServerSupabaseClient();
  const couponIds = await getBusinessCouponIds(supabase, businessId);

  const counts: CustomerSegmentCounts = {
    champion: 0,
    loyal: 0,
    at_risk: 0,
    lost: 0,
    new_customer: 0,
  };

  if (couponIds.length === 0) return counts;

  const { data: redData } = await supabase
    .from('user_redemptions')
    .select('user_id, redeemed_at')
    .in('coupon_id', couponIds);

  if (!Array.isArray(redData) || redData.length === 0) return counts;

  const userMap = new Map<string, { count: number; maxRedeemedAt: number }>();

  (redData as Array<{ user_id: string; redeemed_at: string }>).forEach(
    ({ user_id, redeemed_at }) => {
      const ts = new Date(redeemed_at).getTime();
      const existing = userMap.get(user_id) ?? { count: 0, maxRedeemedAt: 0 };
      existing.count += 1;
      if (ts > existing.maxRedeemedAt) existing.maxRedeemedAt = ts;
      userMap.set(user_id, existing);
    },
  );

  const now = Date.now();

  userMap.forEach(({ count, maxRedeemedAt }) => {
    const daysSince = (now - maxRedeemedAt) / (1000 * 60 * 60 * 24);

    if (count >= 4 && daysSince <= 30) {
      counts.champion += 1;
    } else if (count >= 2 && daysSince <= 60) {
      counts.loyal += 1;
    } else if (count === 1 && daysSince <= 14) {
      counts.new_customer += 1;
    } else if (daysSince <= 90) {
      counts.at_risk += 1;
    } else {
      counts.lost += 1;
    }
  });

  return counts;
}

// ----------------------------------------------------------------
// getBusinessHealthIndicators
// ----------------------------------------------------------------
export async function getBusinessHealthIndicators(
  businessId: string,
): Promise<BusinessHealthData> {
  const supabase = await createServerSupabaseClient();

  const [retention, subResult, activeDealsResult, ratingsResult] =
    await Promise.all([
      getRetentionData(businessId),
      supabase
        .from('subscriptions')
        .select('created_at')
        .eq('business_id', businessId),
      supabase
        .from('coupons')
        .select('id', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('status', 'published')
        .is('archived_at', null)
        .gt('expiry_date', new Date().toISOString()),
      supabase
        .from('business_ratings')
        .select('rating, created_at')
        .eq('business_id', businessId),
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

  // Follower growth
  const subscriptions: Array<{ created_at: string }> = Array.isArray(
    subResult.data,
  )
    ? (subResult.data as Array<{ created_at: string }>)
    : [];

  const now = new Date();
  const thisMonth = { year: now.getFullYear(), month: now.getMonth() };
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthBucket = {
    year: lastMonthDate.getFullYear(),
    month: lastMonthDate.getMonth(),
  };

  const thisMonthFollowers = subscriptions.filter(({ created_at }) => {
    const d = new Date(created_at);
    return (
      d.getFullYear() === thisMonth.year && d.getMonth() === thisMonth.month
    );
  }).length;

  const lastMonthFollowers = subscriptions.filter(({ created_at }) => {
    const d = new Date(created_at);
    return (
      d.getFullYear() === lastMonthBucket.year &&
      d.getMonth() === lastMonthBucket.month
    );
  }).length;

  let follower_growth_trend: 'up' | 'down' | 'flat' = 'flat';
  if (thisMonthFollowers > lastMonthFollowers) follower_growth_trend = 'up';
  else if (thisMonthFollowers < lastMonthFollowers)
    follower_growth_trend = 'down';

  // Active deals
  const active_deals = Number(activeDealsResult.count ?? 0);

  // Avg rating
  const ratings: Array<{ rating: number; created_at: string }> = Array.isArray(
    ratingsResult.data,
  )
    ? (ratingsResult.data as Array<{ rating: number; created_at: string }>)
    : [];

  let avg_rating: number | null = null;
  let rating_trend: 'up' | 'down' | 'flat' = 'flat';

  if (ratings.length > 0) {
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    avg_rating = Math.round((total / ratings.length) * 10) / 10;

    // Compare this month vs last month ratings
    const thisMonthRatings = ratings.filter(({ created_at }) => {
      const d = new Date(created_at);
      return (
        d.getFullYear() === thisMonth.year && d.getMonth() === thisMonth.month
      );
    });
    const lastMonthRatings = ratings.filter(({ created_at }) => {
      const d = new Date(created_at);
      return (
        d.getFullYear() === lastMonthBucket.year &&
        d.getMonth() === lastMonthBucket.month
      );
    });

    if (thisMonthRatings.length > 0 && lastMonthRatings.length > 0) {
      const thisAvg =
        thisMonthRatings.reduce((s, r) => s + r.rating, 0) /
        thisMonthRatings.length;
      const lastAvg =
        lastMonthRatings.reduce((s, r) => s + r.rating, 0) /
        lastMonthRatings.length;
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
