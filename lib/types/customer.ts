/**
 * Customer-portal domain types (public /explore + protected /customer).
 * All shapes are what the customer queries return AFTER storage-URL
 * resolution — components never see raw storage paths.
 */

export interface DirectoryBusiness {
  id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_name: string | null;
  branch: { id: string; name: string; address: string | null } | null;
  follower_count: number;
}

export interface DirectoryMetadata {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CustomerCategory {
  id: string;
  name: string;
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  /** GeoJSON-ish point from PostGIS — [lng, lat] when present. */
  coordinates: [number, number] | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category_name: string | null;
}

export interface PublicCoupon {
  id: string;
  code: string;
  description: string | null;
  discount: { type: 'percentage' | 'fixed_amount'; value: number } | null;
  promotion_type: 'coupon' | 'deal';
  start_date: string;
  expiry_date: string;
  requires_follow: boolean;
  branch_id: string | null;
  max_redemptions_per_user: number | null;
  max_redemptions_global: number | null;
  current_redemptions: number;
}

export interface PublicBusinessProfile {
  id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  interior_images: string[];
  category_name: string | null;
  branches: PublicBranch[];
  follower_count: number;
  rating_average: number | null;
  rating_count: number;
}

export interface WalletRedemption {
  id: string;
  code: string | null;
  redeemed_at: string;
  expires_at: string | null;
  is_claimed: boolean;
  coupon: {
    id: string;
    code: string;
    description: string | null;
    discount: PublicCoupon['discount'];
    expiry_date: string;
    business: {
      id: string;
      shop_name: string;
      logo_url: string | null;
    } | null;
  } | null;
  branch: { id: string; name: string; address: string | null } | null;
}

export type WalletFilter = 'active' | 'claimed' | 'expired';

export interface FollowedBusiness {
  follow_id: string;
  followed_at: string;
  business: {
    id: string;
    shop_name: string;
    logo_url: string | null;
    description: string | null;
  };
}
