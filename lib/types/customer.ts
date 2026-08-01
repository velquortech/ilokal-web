/**
 * Customer-portal domain types (public /explore + protected /customer).
 * All shapes are what the customer queries return AFTER storage-URL
 * resolution — components never see raw storage paths.
 */

import type { PriceType } from './product';
import type { BookingMode } from './offering';
import type { OperatingHours, SocialLinks } from './settings';

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
  /** NULL for quote-based offerings (`price_type === 'on_request'`). */
  price: number | null;
  sale_price: number | null;
  /** Drives the display suffix ("/hr", "/day", "From …") — see `formatOfferingPrice`. */
  price_type: PriceType;
  /** Owner-supplied unit label ("per pax", "per table") overriding the suffix. */
  price_unit: string | null;
  /** `'none'` ⇒ walk-in; anything else renders the booking CTA (phase 4). */
  booking_mode: BookingMode;
  duration_minutes: number | null;
  /** Non-null ⇒ bookable only at that branch (the RPC enforces it). */
  branch_id: string | null;
  image_url: string | null;
  category_name: string | null;
  /** The shop's own grouping. NULL ⇒ shown under "More". */
  section_id: string | null;
  section_name: string | null;
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

/**
 * The public slice of `business_settings`, via the `get_business_public_info`
 * RPC. Deliberately excludes `allow_reviews` / `coupon_default_expiry_days` —
 * internal config — see the `get_business_public_info` migration.
 *
 * Every field is optional in practice: a settings row only exists once the
 * owner saves the form, so most shops have none at all.
 */
export interface PublicBusinessInfo {
  operating_hours: OperatingHours | null;
  social_links: SocialLinks | null;
  contact_website: string | null;
  contact_phone_public: string | null;
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
  /** `null` = the shop published nothing (or the read failed — both render as absent). */
  info: PublicBusinessInfo | null;
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
