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
  total_discount_amount?: number;
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
