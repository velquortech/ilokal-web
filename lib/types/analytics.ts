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

// ===== Admin dashboard =====

export interface GrowthBucket {
  /** Short month label for the axis, e.g. "Jan" — or "Jan 26" over a long window. */
  month: string;
  users: number;
  businesses: number;
}

export interface PlatformGrowth {
  buckets: GrowthBucket[];
  /**
   * The read failed.
   *
   * Reported separately so the chart can say "we couldn't load this" instead
   * of drawing a flat line at zero — on an admin dashboard those look
   * identical and one of them is a decision made on bad information.
   */
  failed: boolean;
}

export interface AdminDashboardSummary {
  /**
   * `null` means THIS figure failed to load.
   *
   * Per-field rather than one flag for the whole object: a failing `pending`
   * count must not blank a `total_users` that came back fine, which is the
   * same outage-vs-empty rule applied one level down.
   */
  total_users: number | null;
  new_users_last_30_days: number | null;
  total_businesses: number | null;
  verified_businesses: number | null;
  /** Shops still waiting on a human decision. */
  pending_businesses: number | null;
  /** At least one figure above is null. */
  failed: boolean;
}
