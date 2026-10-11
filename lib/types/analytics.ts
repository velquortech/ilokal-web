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

/** One step count per stage of the app registration funnel. */
export interface FunnelCounts {
  /** Unique people who opened the tracked link (not raw taps). */
  visitors: number;
  signups: number;
  started: number;
  completed: number;
}

export interface FunnelSource extends FunnelCounts {
  /** The tracked-link ref, e.g. `app_profile`. */
  ref: string;
  /** What staff read, e.g. "App · Profile tab". */
  label: string;
}

/** registration_funnel_report(), narrowed to the mobile app's links. */
export interface RegistrationFunnel {
  days: number;
  sources: FunnelSource[];
  totals: FunnelCounts;
  /** The read failed — say so, never show a funnel of zeros. */
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
  /**
   * Businesses that registered themselves (`origin = 'owner'`). This is what
   * "registered shops" means — `total_businesses` also counts the open-data
   * directory we imported, which at ~70:1 would otherwise make the dashboard
   * report a platform roughly seventy times the size it is.
   */
  owner_businesses: number | null;
  /** Listings staff created, chiefly the OpenStreetMap directory import. */
  seeded_businesses: number | null;
  verified_businesses: number | null;
  /** Shops still waiting on a human decision. */
  pending_businesses: number | null;
  /** At least one figure above is null. */
  failed: boolean;
}
