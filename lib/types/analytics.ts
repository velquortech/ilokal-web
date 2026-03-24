export type PlatformAnalytics = {
  user_count: number;
  business_count: number;
  active_business_count: number;
  total_revenue: number;
  month_over_month_revenue_change?: number;
  start_date?: string | null;
  end_date?: string | null;
};

export type AdminAnalyticsResponse = PlatformAnalytics;
