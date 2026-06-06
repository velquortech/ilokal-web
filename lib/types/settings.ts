export type OperatingHoursDay = {
  open: string;
  close: string;
  closed: boolean;
};

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type OperatingHours = Record<DayKey, OperatingHoursDay>;

export type SocialLinks = {
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
};

export type BusinessSettings = {
  business_id: string;
  operating_hours: OperatingHours | null;
  social_links: SocialLinks | null;
  contact_website: string | null;
  contact_phone_public: string | null;
  allow_reviews: boolean;
  coupon_default_expiry_days: number;
};

export type MFAFactor = {
  id: string;
  friendly_name: string | null;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
};
