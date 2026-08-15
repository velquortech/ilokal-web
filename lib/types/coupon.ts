/**
 * Coupon & Featured Deal Type Definitions
 * Discount management and promotional features
 */

// ===== Discount Type =====
// The stored shape on `coupons.discount` (JSONB). A discriminated union: the
// `type` literal pins the rest of the shape, so a free promo cannot carry a
// stray value and a BOGO must carry buy/get quantities. Kept in sync with
// `discountValueSchema` (lib/validation/coupons.ts) and the
// `coupons_discount_shape_check` constraint (20260817000000) — widen all three
// together.
export type DiscountType = 'percentage' | 'fixed_amount' | 'free' | 'bogo';

export type PercentageDiscount = {
  type: 'percentage';
  value: number; // 0-100
};

export type FixedAmountDiscount = {
  type: 'fixed_amount';
  value: number; // in pesos (₱)
};

export type FreeDiscount = {
  type: 'free';
  /** Always null — present so every arm carries the same key. */
  value: null;
};

export type BogoDiscount = {
  type: 'bogo';
  /** How many the customer must buy to qualify. */
  buy: number;
  /** How many identical items are free. */
  get: number;
  /** Optional cap on free items per redemption. */
  max_free?: number;
  /** Always null — present so every arm carries the same key. */
  value: null;
};

export type DiscountValue =
  | PercentageDiscount
  | FixedAmountDiscount
  | FreeDiscount
  | BogoDiscount;

/**
 * The flat form shape used by the LEGACY add/edit coupon dialogs, which only
 * offer percentage / fixed-₱ until the template-first redesign (Phase 1 of the
 * dashboard UX revamp) replaces them. New code should build `DiscountValue`
 * directly instead of widening this.
 */
export type FlatDiscountType = 'percentage' | 'fixed_amount';

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
  branch_id: string | null;
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
  requires_follow: boolean;
  /**
   * Bucket-relative path in `product-images` for this deal's own photo.
   * NULL means the card falls back to the shop's logo / first interior image,
   * which is what every deal showed before the column existed.
   */
  image_url: string | null;
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
  requires_follow?: boolean;
  image_url?: string | null;
  branch_id?: string | null; // null = applies to all branches
};

export type UpdateCouponRequest = Partial<CreateCouponRequest>;

export type CouponFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CouponStatus;
  sort_by?: 'newest' | 'oldest' | 'expiry_asc' | 'expiry_desc';
  branch_id?: string;
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

// ===== Redeemed Coupons (Business Owner View) =====

export type RedemptionStatus = 'active' | 'claimed' | 'expired';

export type RedemptionRecord = {
  id: string;
  coupon_id: string;
  user_id: string;
  branch_id: string | null;
  redeemed_at: string;
  expires_at: string | null;
  is_claimed: boolean;
  coupons: Pick<
    Coupon,
    'code' | 'discount' | 'usage_scope' | 'expiry_date' | 'description'
  > | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  branches: { name: string; address: string } | null;
};

export type RedemptionRecordFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: RedemptionStatus;
  branch_id?: string;
  sort_by?: 'newest' | 'oldest';
};

export type PaginatedRedemptionRecordsResponse = {
  redemptions: RedemptionRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type RedemptionSummaryStats = {
  total: number;
  unique_users: number;
  active: number;
  claimed: number;
};

// ===== Error Types =====
export type CouponError =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_LIMIT_REACHED'
  | 'COUPON_ALREADY_REDEEMED'
  | 'INVALID_COUPON_CODE'
  | 'FEATURED_DEAL_NOT_FOUND';
