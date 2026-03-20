-- Drop the old constraint if it exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_phone_format;

-- Add the new constraint that allows our phone format
ALTER TABLE public.profiles
ADD CONSTRAINT check_phone_format CHECK (
  phone_number IS NULL 
  OR phone_number ~ '^\+[1-9]\d{1,14}(\s\d+)?$'
);