export type BusinessDashboard = {
  business_id: string;
  product_count: number;
  active_products: number;
  total_orders?: number;
  total_revenue: number;
  revenue_last_30_days?: number;
};

export type ProductPerformance = {
  product_id: string;
  name?: string | null;
  units_sold: number;
  revenue: number;
};

export type CouponStats = {
  coupon_id: string;
  times_redeemed: number;
};

export type TrafficMetrics = {
  business_id: string;
  page_views_last_30_days?: number;
  unique_visitors_last_30_days?: number;
};

export type BusinessRevenue = {
  business_id: string;
  total_revenue: number;
  revenue_by_month?: Record<string, number>;
};

export type RetentionMonth = {
  month: string;
  new_customers: number;
  returning_customers: number;
  churned_customers: number;
};

export type MonthlyTrendPoint = {
  month: string;
  followers: number;
  redemptions: number;
};

export type FollowerFunnelData = {
  total_followers: number;
  ever_redeemed: number;
  active_30d: number;
  loyal: number;
};

export type CouponPerformanceItem = {
  coupon_id: string;
  code: string;
  description: string | null;
  promotion_type: string;
  max_redemptions: number | null;
  redeemed: number;
  rate: number | null;
  avg_days_to_redeem: number | null;
};

export type CustomerSegmentCounts = {
  champion: number;
  loyal: number;
  at_risk: number;
  lost: number;
  new_customer: number;
};

export type BusinessHealthData = {
  retention_rate: number | null;
  retention_trend: 'up' | 'down' | 'flat';
  follower_growth: number;
  follower_growth_trend: 'up' | 'down' | 'flat';
  active_deals: number;
  avg_rating: number | null;
  rating_trend: 'up' | 'down' | 'flat';
};

export type AutomationSuggestion = {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
};

export type BusinessAnalyticsDashboard = {
  health: BusinessHealthData;
  trend: MonthlyTrendPoint[];
  segments: CustomerSegmentCounts;
  retention: RetentionMonth[];
  funnel: FollowerFunnelData;
  couponPerformance: CouponPerformanceItem[];
  suggestions: AutomationSuggestion[];
};
