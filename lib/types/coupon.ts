/**
 * Coupon & Featured Deal Type Definitions
 * Discount management and promotional features
 */

// ===== Discount Type =====
export type DiscountType = 'percentage' | 'fixed_amount';

export type DiscountValue = {
  type: DiscountType;
  value: number; // percentage: 0-100, fixed_amount: in cents
};

// ===== Promotion Type =====
export type PromotionType = 'coupon' | 'deal';

// ===== Coupon Visibility Status =====
export type CouponStatus = 'published' | 'draft';

// ===== Usage Scope =====
export type UsageScope = 'any' | 'specific_categories' | 'specific_products';

// ===== Coupon Types =====
export type Coupon = {
  id: string;
  business_id: string;
  promotion_type: PromotionType;
  status: CouponStatus;
  code: string;
  description: string | null;
  discount: DiscountValue;
  usage_scope: UsageScope;
  scope_values?: string[]; // category IDs or product IDs
  start_date: string;
  expiry_date: string;
  max_redemptions_global: number | null; // null = unlimited
  max_redemptions_per_user: number | null; // null = unlimited
  current_redemptions: number;
  requires_subscription: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CreateCouponRequest = {
  promotion_type?: PromotionType;
  status?: CouponStatus;
  code: string;
  description?: string;
  discount: DiscountValue;
  usage_scope: UsageScope;
  scope_values?: string[];
  start_date: string;
  expiry_date: string;
  max_redemptions_global?: number;
  max_redemptions_per_user?: number;
  requires_subscription?: boolean;
};

export type UpdateCouponRequest = Partial<CreateCouponRequest>;

export type CouponFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CouponStatus;
  sort_by?: 'newest' | 'oldest' | 'expiry_asc' | 'expiry_desc';
};

export type PaginatedCouponsResponse = {
  coupons: Coupon[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type CouponDetailResponse = {
  coupon: Coupon;
  stats: RedemptionStats;
};

// ===== Redemption Types =====
export type CouponRedemption = {
  id: string;
  coupon_id: string;
  user_id: string;
  redeemed_at: string;
};

export type RedemptionStats = {
  coupon_id: string;
  total_redemptions: number;
  unique_users: number;
  remaining_global: number | null;
  last_redeemed_at: string | null;
};

// ===== Featured Deal Types =====
export type FeaturedDealDuration = 'daily' | 'weekly' | 'monthly';

export type FeaturedDeal = {
  id: string;
  coupon_id: string;
  business_id: string;
  duration: FeaturedDealDuration;
  placement: 'category_page' | 'homepage_banner' | 'search_featured';
  start_date: string;
  end_date: string;
  price_cents: number; // cost to feature
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type CreateFeaturedDealRequest = {
  coupon_id: string;
  duration: FeaturedDealDuration;
  placement: 'category_page' | 'homepage_banner' | 'search_featured';
  start_date: string;
  end_date?: string; // auto-calculated based on duration if not provided
  price_cents: number;
};

export type UpdateFeaturedDealRequest = Partial<CreateFeaturedDealRequest>;

export type FeaturedDealFilters = {
  page?: number;
  per_page?: number;
  placement?: 'category_page' | 'homepage_banner' | 'search_featured';
  sort_by?: 'newest' | 'oldest' | 'expiry_asc' | 'expiry_desc';
};

export type PaginatedFeaturedDealsResponse = {
  deals: FeaturedDeal[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

// ===== Error Types =====
export type CouponError =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_LIMIT_REACHED'
  | 'COUPON_ALREADY_REDEEMED'
  | 'INVALID_COUPON_CODE'
  | 'FEATURED_DEAL_NOT_FOUND';
