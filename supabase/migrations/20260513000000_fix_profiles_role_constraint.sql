-- Fix profiles table role constraint to include 'app_user'
-- The form schema uses 'app_user' for customer accounts, but migration only allowed 'user'

-- Drop old constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_role_check;

-- Add updated constraint with 'app_user'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'business_owner', 'app_user', 'user'));

-- Update any existing 'user' roles to 'app_user' for consistency
UPDATE public.profiles SET role = 'app_user' WHERE role = 'user';
