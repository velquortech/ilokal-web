-- 1. Enable PostGIS for "Shops Near Me"
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Define Enums (Strict Types)
CREATE TYPE public.user_role AS ENUM ('admin', 'business_owner', 'app_user');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'suspended', 'rejected');
CREATE TYPE public.coupon_type AS ENUM ('discount', 'deal', 'voucher');

-- 3. Shared Automation: "Updated_At" Trigger Function
-- This function will be reused by ALL tables below.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
