-- 1. Add the new JSONB column
ALTER TABLE public.businesses 
ADD COLUMN verification_documents JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate existing data into the new column
-- We use jsonb_build_object to structure the existing data
UPDATE public.businesses
SET verification_documents = jsonb_build_object(
  'business_license', business_license_url,
  'tax_certificate', tax_certificate_url,
  'additional_docs', verification_docs_url
);

-- 3. Drop the old columns
ALTER TABLE public.businesses
DROP COLUMN business_license_url,
DROP COLUMN tax_certificate_url,
DROP COLUMN verification_docs_url;

-- 4. Add a check constraint to ensure it remains an object
ALTER TABLE public.businesses
ADD CONSTRAINT valid_verification_documents_structure 
CHECK (jsonb_typeof(verification_documents) = 'object');