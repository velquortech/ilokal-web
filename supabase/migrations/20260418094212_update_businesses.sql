-- 1. Modify the table structure
ALTER TABLE public.businesses
  -- Rename existing name to match form data
  RENAME COLUMN name TO shop_name;

ALTER TABLE public.businesses
  -- Add business_category as a single JSONB column
  ADD COLUMN business_category JSONB DEFAULT '{"type": "predefined", "name": "General"}'::jsonb,
  
  -- Keep location as JSONB for the address hierarchy
  ADD COLUMN location JSONB DEFAULT '{}'::jsonb,
  
  -- Add new document URL columns
  ADD COLUMN business_license_url TEXT,
  ADD COLUMN tax_certificate_url TEXT,
  
  Add COLUMN banner_url TEXT,
  ADD COLUMN is_verified boolean DEFAULT false;

-- 2. Optional: Add a check constraint to ensure the JSONB structure
-- This prevents invalid objects from being saved
ALTER TABLE public.businesses
ADD CONSTRAINT valid_business_category_structure CHECK (
  jsonb_typeof(business_category) = 'object' 
  AND business_category ? 'type' 
  AND business_category ? 'name'
);